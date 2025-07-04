import * as vscode from 'vscode';
import { BaseValidator, ValidationResult, ValidationOptions } from './base-validator';
import { TemplateParser } from '../template-parser';

/**
 * テンプレート参照検証を担当するクラス
 */
export class TemplateReferenceValidator extends BaseValidator {
  private templateParser: TemplateParser;
  
  constructor(templateParser: TemplateParser) {
    super();
    this.templateParser = templateParser;
  }

  /**
   * テンプレート参照検証を実行
   */
  async validate(
    text: string,
    document: vscode.TextDocument,
    options?: ValidationOptions
  ): Promise<ValidationResult> {
    const diagnostics: vscode.Diagnostic[] = [];
    
    try {
      // テンプレートファイルでない場合のみ実行
      if (!options?.isTemplate) {
        const templateDiagnostics = await this.validateTemplateReferences(text, document);
        diagnostics.push(...templateDiagnostics);
      }
      
      // テンプレートファイルの場合は構文検証を実行
      if (options?.isTemplate) {
        const syntaxDiagnostics = await this.validateTemplateSyntax(text, document);
        diagnostics.push(...syntaxDiagnostics);
      }
      
      return {
        valid: diagnostics.length === 0,
        diagnostics,
        errors: []
      };
    } catch (error) {
      const errorDiagnostic = this.createDiagnostic(
        `テンプレート参照検証エラー: ${error instanceof Error ? error.message : String(error)}`,
        new vscode.Range(0, 0, 0, 1),
        vscode.DiagnosticSeverity.Error
      );
      diagnostics.push(errorDiagnostic);
      
      return {
        valid: false,
        diagnostics,
        errors: [error]
      };
    }
  }

  /**
   * テンプレート参照を検証
   */
  private async validateTemplateReferences(
    text: string,
    document: vscode.TextDocument
  ): Promise<vscode.Diagnostic[]> {
    const diagnostics: vscode.Diagnostic[] = [];
    
    try {
      // 循環参照の検証
      if (text.includes('$include:')) {
        const circularRefs = this.templateParser.detectCircularReferences(text, document.fileName);
        for (const ref of circularRefs) {
          const diag = this.createDiagnostic(
            `循環参照が検出されました: ${ref}`,
            new vscode.Range(0, 0, 0, 1),
            vscode.DiagnosticSeverity.Error
          );
          diagnostics.push(diag);
        }
      }

      // $include構文の検証
      const includeDiagnostics = await this.validateIncludeReferences(text, document);
      diagnostics.push(...includeDiagnostics);

      // $if構文の検証
      const ifDiagnostics = this.validateIfReferences(text, document);
      diagnostics.push(...ifDiagnostics);

      // $foreach構文の検証
      const foreachDiagnostics = this.validateForeachReferences(text, document);
      diagnostics.push(...foreachDiagnostics);

    } catch (error) {
      console.error('[TemplateReferenceValidator] テンプレート参照検証でエラーが発生しました:', error);
    }

    return diagnostics;
  }

  /**
   * $include構文を検証
   */
  private async validateIncludeReferences(
    text: string,
    document: vscode.TextDocument
  ): Promise<vscode.Diagnostic[]> {
    const diagnostics: vscode.Diagnostic[] = [];
    
    const includeMatches = text.match(/\$include:\s*\n\s*template:\s*["']?([^"\n]+)["']?/g);
    if (includeMatches) {
      for (const match of includeMatches) {
        const templatePathMatch = match.match(/template:\s*["']?([^"\n]+)["']?/);
        if (templatePathMatch) {
          const templatePath = templatePathMatch[1];
          const exists = await this.templateParser.validateTemplatePath(templatePath, document.fileName);
          if (!exists) {
            const lineNumber = this.findLineNumber(text, match);
            const range = new vscode.Range(lineNumber, 0, lineNumber, match.length);
            const diagnostic = this.createDiagnostic(
              `テンプレートファイルが見つかりません: ${templatePath}`,
              range,
              vscode.DiagnosticSeverity.Error
            );
            diagnostics.push(diagnostic);
          }
        }
      }
    }
    
    return diagnostics;
  }

  /**
   * $if構文を検証
   */
  private validateIfReferences(
    text: string,
    document: vscode.TextDocument
  ): vscode.Diagnostic[] {
    const diagnostics: vscode.Diagnostic[] = [];
    
    const ifMatches = text.match(/\$if:\s*\n\s*condition:\s*["']?([^"\n]+)["']?/g);
    if (ifMatches) {
      for (const match of ifMatches) {
        const conditionMatch = match.match(/condition:\s*["']?([^"\n]+)["']?/);
        if (conditionMatch) {
          const condition = conditionMatch[1];
          
          // 条件式の基本的な検証
          if (!this.isValidConditionExpression(condition)) {
            const lineNumber = this.findLineNumber(text, match);
            const range = new vscode.Range(lineNumber, 0, lineNumber, match.length);
            const diagnostic = this.createDiagnostic(
              `無効な条件式です: ${condition}`,
              range,
              vscode.DiagnosticSeverity.Warning
            );
            diagnostics.push(diagnostic);
          }
        }
      }
    }
    
    return diagnostics;
  }

  /**
   * $foreach構文を検証
   */
  private validateForeachReferences(
    text: string,
    document: vscode.TextDocument
  ): vscode.Diagnostic[] {
    const diagnostics: vscode.Diagnostic[] = [];
    
    const foreachMatches = text.match(/\$foreach:\s*\n\s*items:\s*["']?([^"\n]+)["']?\s*\n\s*as:\s*["']?([^"\n]+)["']?/g);
    if (foreachMatches) {
      for (const match of foreachMatches) {
        const itemsMatch = match.match(/items:\s*["']?([^"\n]+)["']?/);
        const asMatch = match.match(/as:\s*["']?([^"\n]+)["']?/);
        
        if (itemsMatch && asMatch) {
          const items = itemsMatch[1];
          const as = asMatch[1];
          
          // items式の基本的な検証
          if (!this.isValidItemsExpression(items)) {
            const lineNumber = this.findLineNumber(text, match);
            const range = new vscode.Range(lineNumber, 0, lineNumber, match.length);
            const diagnostic = this.createDiagnostic(
              `無効なitems式です: ${items}`,
              range,
              vscode.DiagnosticSeverity.Warning
            );
            diagnostics.push(diagnostic);
          }
          
          // as変数名の基本的な検証
          if (!this.isValidVariableName(as)) {
            const lineNumber = this.findLineNumber(text, match);
            const range = new vscode.Range(lineNumber, 0, lineNumber, match.length);
            const diagnostic = this.createDiagnostic(
              `無効な変数名です: ${as}`,
              range,
              vscode.DiagnosticSeverity.Warning
            );
            diagnostics.push(diagnostic);
          }
        }
      }
    }
    
    return diagnostics;
  }

  /**
   * テンプレートファイルの構文検証
   */
  private async validateTemplateSyntax(
    text: string,
    document: vscode.TextDocument
  ): Promise<vscode.Diagnostic[]> {
    const diagnostics: vscode.Diagnostic[] = [];
    
    try {
      // $if構文の検証
      const ifDiagnostics = this.validateIfSyntax(text, document);
      diagnostics.push(...ifDiagnostics);

      // $foreach構文の検証
      const foreachDiagnostics = this.validateForeachSyntax(text, document);
      diagnostics.push(...foreachDiagnostics);

    } catch (error) {
      const errorDiagnostic = this.createDiagnostic(
        `テンプレート構文検証エラー: ${error instanceof Error ? error.message : String(error)}`,
        new vscode.Range(0, 0, 0, 1),
        vscode.DiagnosticSeverity.Error
      );
      diagnostics.push(errorDiagnostic);
    }
    
    return diagnostics;
  }

  /**
   * $if構文の構文検証
   */
  private validateIfSyntax(
    text: string,
    document: vscode.TextDocument
  ): vscode.Diagnostic[] {
    const diagnostics: vscode.Diagnostic[] = [];
    
    // $if: で始まる行を検索
    const ifBlocks = text.match(/\$if:\s*\n[\s\S]*?(?=\n\s*\$|\n\s*[a-zA-Z]|\n\s*-|\n\s*$|\n$|$)/g);
    if (ifBlocks) {
      for (const block of ifBlocks) {
        // conditionフィールドの存在確認
        if (!block.includes('condition:')) {
          const lineNumber = this.findLineNumber(text, block);
          const range = new vscode.Range(lineNumber, 0, lineNumber, block.length);
          const diagnostic = this.createDiagnostic(
            '$if構文にはconditionフィールドが必要です',
            range,
            vscode.DiagnosticSeverity.Error
          );
          diagnostics.push(diagnostic);
        }
        
        // templateフィールドの存在確認
        if (!block.includes('template:')) {
          const lineNumber = this.findLineNumber(text, block);
          const range = new vscode.Range(lineNumber, 0, lineNumber, block.length);
          const diagnostic = this.createDiagnostic(
            '$if構文にはtemplateフィールドが必要です',
            range,
            vscode.DiagnosticSeverity.Error
          );
          diagnostics.push(diagnostic);
        }
      }
    }
    
    return diagnostics;
  }

  /**
   * $foreach構文の構文検証
   */
  private validateForeachSyntax(
    text: string,
    document: vscode.TextDocument
  ): vscode.Diagnostic[] {
    const diagnostics: vscode.Diagnostic[] = [];
    
    // $foreach: で始まる行を検索
    const foreachBlocks = text.match(/\$foreach:\s*\n[\s\S]*?(?=\n\s*\$|\n\s*[a-zA-Z]|\n\s*-|\n\s*$|\n$|$)/g);
    if (foreachBlocks) {
      for (const block of foreachBlocks) {
        // itemsフィールドの存在確認
        if (!block.includes('items:')) {
          const lineNumber = this.findLineNumber(text, block);
          const range = new vscode.Range(lineNumber, 0, lineNumber, block.length);
          const diagnostic = this.createDiagnostic(
            '$foreach構文にはitemsフィールドが必要です',
            range,
            vscode.DiagnosticSeverity.Error
          );
          diagnostics.push(diagnostic);
        }
        
        // asフィールドの存在確認
        if (!block.includes('as:')) {
          const lineNumber = this.findLineNumber(text, block);
          const range = new vscode.Range(lineNumber, 0, lineNumber, block.length);
          const diagnostic = this.createDiagnostic(
            '$foreach構文にはasフィールドが必要です',
            range,
            vscode.DiagnosticSeverity.Error
          );
          diagnostics.push(diagnostic);
        }
        
        // templateフィールドの存在確認
        if (!block.includes('template:')) {
          const lineNumber = this.findLineNumber(text, block);
          const range = new vscode.Range(lineNumber, 0, lineNumber, block.length);
          const diagnostic = this.createDiagnostic(
            '$foreach構文にはtemplateフィールドが必要です',
            range,
            vscode.DiagnosticSeverity.Error
          );
          diagnostics.push(diagnostic);
        }
      }
    }
    
    return diagnostics;
  }

  /**
   * 条件式が有効かどうかを検証
   */
  private isValidConditionExpression(condition: string): boolean {
    const trimmedCondition = condition.trim();
    
    // $params.xxx 形式の変数参照
    if (trimmedCondition.startsWith('$params.')) {
      return true;
    }
    
    // 真偽値の直接指定
    if (trimmedCondition === 'true' || trimmedCondition === 'false') {
      return true;
    }
    
    // 数値
    if (/^\d+$/.test(trimmedCondition)) {
      return true;
    }
    
    // 文字列（引用符で囲まれている）
    if ((trimmedCondition.startsWith('"') && trimmedCondition.endsWith('"')) ||
        (trimmedCondition.startsWith("'") && trimmedCondition.endsWith("'"))) {
      return true;
    }
    
    return false;
  }

  /**
   * items式が有効かチェック
   */
  private isValidItemsExpression(items: string): boolean {
    const trimmed = items.trim();
    
    // $params.xxx 形式
    if (trimmed.startsWith('$params.')) {
      return /^$params\.[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)*$/.test(trimmed);
    }
    
    // 配列リテラル
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        JSON.parse(trimmed);
        return true;
      } catch {
        return false;
      }
    }
    
    // {{ xxx }} 形式の文字列補間
    if (trimmed.includes('{{') && trimmed.includes('}}')) {
      return true;
    }
    
    return false;
  }

  /**
   * 変数名が有効かチェック
   */
  private isValidVariableName(name: string): boolean {
    const trimmed = name.trim();
    
    // JavaScriptの変数名規則に従う
    return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(trimmed);
  }
} 