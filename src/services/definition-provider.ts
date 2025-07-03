import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { TemplateParser } from './template-parser';

/**
 * 定義プロバイダー
 * テンプレートファイルの参照元から定義元にジャンプする機能を提供
 */
export class TextUIDefinitionProvider implements vscode.DefinitionProvider {
  private templateParser: TemplateParser;

  constructor() {
    this.templateParser = new TemplateParser();
  }

  /**
   * 定義位置を提供
   */
  async provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): Promise<vscode.Definition | vscode.DefinitionLink[] | undefined> {
    try {
      // .tui.ymlファイルでのみ動作
      if (!document.fileName.endsWith('.tui.yml')) {
        return undefined;
      }

      const text = document.getText();
      const lineText = document.lineAt(position.line).text;
      
      // $include構文のtemplateプロパティの値をチェック
      const includeMatch = this.findIncludeTemplate(document, position);
      if (includeMatch) {
        return await this.resolveTemplateDefinition(includeMatch.templatePath, document.fileName);
      }

      // テンプレート内の変数参照をチェック
      const variableMatch = this.findVariableReference(lineText, position.character);
      if (variableMatch) {
        return await this.resolveVariableDefinition(variableMatch.variableName, document.fileName);
      }

      return undefined;
    } catch (error) {
      return undefined;
    }
  }

  /**
   * $include構文のtemplateプロパティを検出
   */
  private findIncludeTemplate(document: vscode.TextDocument, position: vscode.Position): { templatePath: string; start: number; end: number } | undefined {
    const text = document.getText();
    const lines = text.split('\n');
    const currentLine = position.line;
    const currentChar = position.character;
    const lineText = lines[currentLine];
    
    // 現在の行でtemplateプロパティを検出
    const includeMatch = lineText.match(/^\s*(?:template|file):\s*["']?([^"'\s]+)["']?/);
    if (includeMatch) {
      const templatePath = includeMatch[1];
      const start = lineText.indexOf(templatePath);
      const end = start + templatePath.length;
      
      // カーソル位置がテンプレートパス内にあるかチェック
      if (currentChar >= start && currentChar <= end) {
        return {
          templatePath,
          start,
          end
        };
      }
    }

    // YAMLオブジェクト形式の$includeを検出（複数行対応）
    const yamlIncludeMatch = lineText.match(/^\s*\$include:\s*$/);
    if (yamlIncludeMatch) {
      // 次の行のtemplateプロパティをチェック
      if (currentLine + 1 < lines.length) {
        const nextLine = lines[currentLine + 1];
        const nextLineMatch = nextLine.match(/^\s*(?:template|file):\s*["']?([^"'\s]+)["']?/);
        if (nextLineMatch) {
          const templatePath = nextLineMatch[1];
          const start = nextLine.indexOf(templatePath);
          const end = start + templatePath.length;
          
          // カーソル位置が次の行のテンプレートパス内にあるかチェック
          if (currentLine + 1 === position.line && currentChar >= start && currentChar <= end) {
            return {
              templatePath,
              start,
              end
            };
          }
        }
      }
    }

    return undefined;
  }

  /**
   * テンプレート内の変数参照を検出
   */
  private findVariableReference(lineText: string, character: number): { variableName: string; start: number; end: number } | undefined {
    // {{ $params.xxx }} 形式の変数参照を検出
    const variableMatch = lineText.match(/\{\{\s*\$params\.([^}]+)\s*\}\}/g);
    if (variableMatch) {
      for (const match of variableMatch) {
        const start = lineText.indexOf(match);
        const end = start + match.length;
        
        if (character >= start && character <= end) {
          const variableName = match.replace(/\{\{\s*\$params\.([^}]+)\s*\}\}/, '$1');
          return {
            variableName,
            start,
            end
          };
        }
      }
    }

    return undefined;
  }

  /**
   * テンプレートファイルの定義位置を解決
   */
  private async resolveTemplateDefinition(templatePath: string, baseFilePath: string): Promise<vscode.Definition | undefined> {
    try {
      // テンプレートファイルのパスを解決
      const resolvedPath = this.resolveTemplatePath(templatePath, baseFilePath);
      
      // ファイルの存在確認
      if (!fs.existsSync(resolvedPath)) {
        return undefined;
      }

      // ファイルのURIを作成
      const uri = vscode.Uri.file(resolvedPath);
      
      // ファイルの内容を読み込み、適切な位置を特定
      const content = fs.readFileSync(resolvedPath, 'utf-8');
      const definitionPosition = this.findTemplateDefinitionPosition(content);
      
      return new vscode.Location(uri, definitionPosition);
    } catch (error) {
      return undefined;
    }
  }

  /**
   * 変数の定義位置を解決
   */
  private async resolveVariableDefinition(variableName: string, baseFilePath: string): Promise<vscode.Definition | undefined> {
    try {
      // 現在のファイル内で変数の定義を検索
      const document = await vscode.workspace.openTextDocument(baseFilePath);
      const text = document.getText();
      
      // paramsセクション内で変数を検索
      const paramsMatch = text.match(/params:\s*\n([\s\S]*?)(?=\n\s*\w|$)/);
      if (paramsMatch) {
        const paramsContent = paramsMatch[1];
        const lines = paramsContent.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const variableMatch = line.match(new RegExp(`^\\s*${variableName.replace(/\./g, '\\.')}:\\s*`));
          if (variableMatch) {
            // パラメータセクションの開始位置を計算
            const paramsStart = text.indexOf('params:');
            const paramsLines = text.substring(0, paramsStart).split('\n');
            const lineNumber = paramsLines.length - 1 + i;
            
            return new vscode.Location(
              vscode.Uri.file(baseFilePath),
              new vscode.Position(lineNumber, line.indexOf(variableName))
            );
          }
        }
      }
      
      return undefined;
    } catch (error) {
      return undefined;
    }
  }

  /**
   * テンプレートファイルのパスを解決
   */
  private resolveTemplatePath(templatePath: string, baseFilePath: string): string {
    // 絶対パスの場合
    if (path.isAbsolute(templatePath)) {
      return templatePath;
    }

    // 相対パスの場合
    const baseDir = path.dirname(baseFilePath);
    const resolvedPath = path.resolve(baseDir, templatePath);

    // パストラバーサル攻撃の防止
    const normalizedPath = path.normalize(resolvedPath);
    if (!normalizedPath.startsWith(path.resolve(baseDir))) {
      throw new Error('Invalid template path');
    }

    return normalizedPath;
  }

  /**
   * テンプレートファイル内の定義位置を特定
   */
  private findTemplateDefinitionPosition(content: string): vscode.Position {
    const lines = content.split('\n');
    
    // テンプレートの開始位置を探す（最初の有効な行）
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line && !line.startsWith('#')) {
        return new vscode.Position(i, 0);
      }
    }
    
    return new vscode.Position(0, 0);
  }
} 