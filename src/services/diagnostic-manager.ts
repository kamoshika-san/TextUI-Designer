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
  private validationCache: Map<string, { content: string; diagnostics: vscode.Diagnostic[]; timestamp: number }> = new Map();
  private validationTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private ajvInstance: Ajv | null = null;
  private schemaCache: any = null;
  private lastSchemaLoad: number = 0;
  private readonly CACHE_TTL = 5000; // 5秒
  private readonly DEBOUNCE_DELAY = 500; // 500ms

  constructor(schemaManager: any) {
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection('textui-designer');
    this.schemaManager = schemaManager;
  }

  /**
   * ドキュメントの診断を実行（デバウンス付き）
   */
  async validateAndReportDiagnostics(document: vscode.TextDocument): Promise<void> {
    const isTui = document.fileName.endsWith('.tui.yml');
    const isTemplate = /\.template\.(ya?ml|json)$/.test(document.fileName);
    
    if (!isTui && !isTemplate) return;

    const uri = document.uri.toString();
    const text = document.getText();

    // 既存のタイマーをクリア
    if (this.validationTimeouts.has(uri)) {
      clearTimeout(this.validationTimeouts.get(uri)!);
    }

    // デバウンス処理
    const timeout = setTimeout(async () => {
      await this.performValidation(document, text, isTemplate);
      this.validationTimeouts.delete(uri);
    }, this.DEBOUNCE_DELAY);

    this.validationTimeouts.set(uri, timeout);
  }

  /**
   * 実際の検証処理を実行
   */
  private async performValidation(document: vscode.TextDocument, text: string, isTemplate: boolean): Promise<void> {
    const uri = document.uri.toString();
    const now = Date.now();

    // キャッシュチェック
    const cached = this.validationCache.get(uri);
    if (cached && cached.content === text && (now - cached.timestamp) < this.CACHE_TTL) {
      console.log('[DiagnosticManager] キャッシュされた診断結果を使用');
      this.diagnosticCollection.set(document.uri, cached.diagnostics);
      return;
    }

    let diagnostics: vscode.Diagnostic[] = [];

    try {
      // YAMLパース処理を非同期で実行（ブロッキングを防ぐ）
      const yaml = await new Promise((resolve, reject) => {
        setImmediate(() => {
          try {
            const parsed = YAML.parse(text);
            resolve(parsed);
          } catch (error) {
            reject(error);
          }
        });
      });
      
      // スキーマキャッシュの更新チェック
      if (!this.schemaCache || (now - this.lastSchemaLoad) > this.CACHE_TTL) {
        this.schemaCache = await this.schemaManager.loadSchema();
        this.lastSchemaLoad = now;
        this.ajvInstance = new Ajv({ allErrors: true, allowUnionTypes: true });
      }

      if (!this.ajvInstance) {
        this.ajvInstance = new Ajv({ allErrors: true, allowUnionTypes: true });
      }
      
      let validate;
      if (isTemplate) {
        // テンプレート用: ルートがコンポーネント配列でもOKなスキーマを動的生成
        const templateSchema = {
          ...this.schemaCache,
          type: 'array',
          items: this.schemaCache.definitions.component
        };
        validate = this.ajvInstance.compile(templateSchema);
      } else {
        validate = this.ajvInstance.compile(this.schemaCache);
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

    // キャッシュを更新
    this.validationCache.set(uri, {
      content: text,
      diagnostics: diagnostics,
      timestamp: now
    });

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
    this.validationCache.clear();
    this.validationTimeouts.forEach(timeout => clearTimeout(timeout));
    this.validationTimeouts.clear();
  }

  /**
   * 特定のURIの診断をクリア
   */
  clearDiagnosticsForUri(uri: vscode.Uri): void {
    this.diagnosticCollection.delete(uri);
    this.validationCache.delete(uri.toString());
    
    const timeout = this.validationTimeouts.get(uri.toString());
    if (timeout) {
      clearTimeout(timeout);
      this.validationTimeouts.delete(uri.toString());
    }
  }

  /**
   * キャッシュをクリア
   */
  clearCache(): void {
    this.validationCache.clear();
    this.schemaCache = null;
    this.ajvInstance = null;
    this.lastSchemaLoad = 0;
  }

  /**
   * 診断コレクションを破棄
   */
  dispose(): void {
    this.clearDiagnostics();
    this.diagnosticCollection.dispose();
  }
} 