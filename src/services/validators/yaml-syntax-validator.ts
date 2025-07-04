import * as vscode from 'vscode';
import * as YAML from 'yaml';
import { BaseValidator, ValidationResult, ValidationOptions } from './base-validator';

/**
 * YAML構文検証を担当するクラス
 */
export class YamlSyntaxValidator extends BaseValidator {
  
  /**
   * YAML構文検証を実行
   */
  async validate(
    text: string,
    document: vscode.TextDocument,
    options?: ValidationOptions
  ): Promise<ValidationResult> {
    const diagnostics: vscode.Diagnostic[] = [];
    let parsedYaml: any = null;
    
    try {
      // 非同期でYAMLパースを実行（ブロッキングを防ぐ）
      if (options?.async) {
        parsedYaml = await this.parseYamlAsync(text);
      } else {
        parsedYaml = YAML.parse(text);
      }
      
      // 追加の構文チェック
      const syntaxDiagnostics = this.performAdditionalSyntaxChecks(text, document);
      diagnostics.push(...syntaxDiagnostics);
      
      return {
        valid: diagnostics.length === 0,
        diagnostics,
        errors: []
      };
    } catch (error) {
      // YAMLパースエラーを診断情報に変換
      const parseDiagnostic = this.createYamlParseErrorDiagnostic(error, text, document);
      diagnostics.push(parseDiagnostic);
      
      return {
        valid: false,
        diagnostics,
        errors: [error]
      };
    }
  }

  /**
   * 非同期でYAMLをパース
   */
  private async parseYamlAsync(text: string): Promise<any> {
    return new Promise((resolve, reject) => {
      setImmediate(() => {
        try {
          const parsed = YAML.parse(text);
          resolve(parsed);
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  /**
   * YAMLパースエラーを診断情報に変換
   */
  private createYamlParseErrorDiagnostic(
    error: any,
    text: string,
    document: vscode.TextDocument
  ): vscode.Diagnostic {
    const message = error instanceof Error ? error.message : String(error);
    
    // エラーの位置情報を取得
    if (error.pos && typeof error.pos === 'object') {
      const position = document.positionAt(error.pos.start || 0);
      const range = new vscode.Range(position, position);
      return this.createDiagnostic(
        `YAML構文エラー: ${message}`,
        range,
        vscode.DiagnosticSeverity.Error
      );
    }
    
    // 位置情報がない場合は先頭に配置
    return this.createDiagnostic(
      `YAML構文エラー: ${message}`,
      new vscode.Range(0, 0, 0, 1),
      vscode.DiagnosticSeverity.Error
    );
  }

  /**
   * 追加の構文チェック
   */
  private performAdditionalSyntaxChecks(
    text: string,
    document: vscode.TextDocument
  ): vscode.Diagnostic[] {
    const diagnostics: vscode.Diagnostic[] = [];
    
    // 基本的な構文チェック
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // インデントチェック
      if (line.trim().length > 0) {
        const leadingSpaces = line.length - line.trimStart().length;
        if (leadingSpaces % 2 !== 0) {
          const range = new vscode.Range(i, 0, i, leadingSpaces);
          const diagnostic = this.createDiagnostic(
            '不正なインデント: 2の倍数のスペースを使用してください',
            range,
            vscode.DiagnosticSeverity.Warning
          );
          diagnostics.push(diagnostic);
        }
      }
      
      // タブ文字チェック
      if (line.includes('\t')) {
        const tabIndex = line.indexOf('\t');
        const range = new vscode.Range(i, tabIndex, i, tabIndex + 1);
        const diagnostic = this.createDiagnostic(
          'タブ文字が使用されています: スペースを使用してください',
          range,
          vscode.DiagnosticSeverity.Warning
        );
        diagnostics.push(diagnostic);
      }
    }
    
    return diagnostics;
  }
} 