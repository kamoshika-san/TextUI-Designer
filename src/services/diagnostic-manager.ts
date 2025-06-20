import * as vscode from 'vscode';
import * as YAML from 'yaml';
import Ajv from 'ajv';

/**
 * 診断管理サービス
 * YAML/JSONファイルのバリデーションとエラー表示を担当
 */
export class DiagnosticManager {
  private diagnosticCollection: vscode.DiagnosticCollection;
  private schemaManager: any; // SchemaManagerの型を後で定義

  constructor(schemaManager: any) {
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection('textui-designer');
    this.schemaManager = schemaManager;
  }

  /**
   * ドキュメントの診断を実行
   */
  async validateAndReportDiagnostics(document: vscode.TextDocument): Promise<void> {
    const isTui = document.fileName.endsWith('.tui.yml');
    const isTemplate = /\.template\.(ya?ml|json)$/.test(document.fileName);
    
    if (!isTui && !isTemplate) return;

    const text = document.getText();
    let diagnostics: vscode.Diagnostic[] = [];

    try {
      const yaml = YAML.parse(text);
      const schema = await this.schemaManager.loadSchema();
      const ajv = new Ajv({ allErrors: true, allowUnionTypes: true });
      
      let validate;
      if (isTemplate) {
        // テンプレート用: ルートがコンポーネント配列でもOKなスキーマを動的生成
        const templateSchema = {
          ...schema,
          type: 'array',
          items: schema.definitions.component
        };
        validate = ajv.compile(templateSchema);
      } else {
        validate = ajv.compile(schema);
      }

      const valid = validate(yaml);
      if (!valid && validate.errors) {
        diagnostics = this.createDiagnosticsFromErrors(validate.errors, text, document);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const diag = new vscode.Diagnostic(
        new vscode.Range(0, 0, 0, 1),
        msg,
        vscode.DiagnosticSeverity.Error
      );
      diagnostics.push(diag);
    }

    this.diagnosticCollection.set(document.uri, diagnostics);
  }

  /**
   * エラーから診断情報を作成
   */
  private createDiagnosticsFromErrors(
    errors: any[],
    text: string,
    document: vscode.TextDocument
  ): vscode.Diagnostic[] {
    const diagnostics: vscode.Diagnostic[] = [];

    for (const err of errors) {
      const key = err.instancePath.split('/').filter(Boolean).pop();
      if (key) {
        const regex = new RegExp(`^\\s*${key}:`, 'm');
        const match = text.match(regex);
        if (match) {
          const start = text.indexOf(match[0]);
          const startPos = document.positionAt(start);
          const endPos = document.positionAt(start + match[0].length);
          const diag = new vscode.Diagnostic(
            new vscode.Range(startPos, endPos),
            err.message || 'スキーマエラー',
            vscode.DiagnosticSeverity.Error
          );
          diagnostics.push(diag);
        }
      }
    }

    return diagnostics;
  }

  /**
   * 診断コレクションをクリア
   */
  clearDiagnostics(): void {
    this.diagnosticCollection.clear();
  }

  /**
   * 特定のURIの診断をクリア
   */
  clearDiagnosticsForUri(uri: vscode.Uri): void {
    this.diagnosticCollection.delete(uri);
  }

  /**
   * 診断コレクションを破棄
   */
  dispose(): void {
    this.diagnosticCollection.dispose();
  }
} 