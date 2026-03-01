import * as vscode from 'vscode';
import * as YAML from 'yaml';
import Ajv, { ErrorObject } from 'ajv';
import { TextUIMemoryTracker } from '../utils/textui-memory-tracker';
import { ISchemaManager, SchemaDefinition } from '../types';

type DiagnosticCacheEntry = {
  content: string;
  diagnostics: vscode.Diagnostic[];
  timestamp: number;
};

type ValidationSchemaKind = 'main' | 'template' | 'theme';

/**
 * 診断管理サービス
 * YAML/JSONファイルのバリデーションとエラー表示を担当
 */
export class DiagnosticManager {
  private diagnosticCollection: vscode.DiagnosticCollection;
  private schemaManager: ISchemaManager;
  private validationCache: Map<string, DiagnosticCacheEntry> = new Map();
  private validationTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private ajvInstance: Ajv | null = null;
  private schemaCaches: Record<ValidationSchemaKind, SchemaDefinition | null> = {
    main: null,
    template: null,
    theme: null
  };
  private lastSchemaLoads: Record<ValidationSchemaKind, number> = {
    main: 0,
    template: 0,
    theme: 0
  };
  private readonly CACHE_TTL = 5000; // 5秒
  private readonly DEBOUNCE_DELAY = 500; // 500ms
  private diagnosticTimeout: NodeJS.Timeout | null = null;
  private readonly MAX_CACHE_SIZE = 100; // キャッシュサイズ制限
  private readonly MAX_CACHE_AGE = 30000; // 30秒でキャッシュをクリア
  private memoryTracker: TextUIMemoryTracker;

  constructor(schemaManager: ISchemaManager) {
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection('textui-designer');
    this.schemaManager = schemaManager;
    this.memoryTracker = TextUIMemoryTracker.getInstance();
  }

  /**
   * 診断を実行（デバウンス付き）
   */
  async validateAndReportDiagnostics(document: vscode.TextDocument): Promise<void> {
    // 既存のタイマーをクリア
    if (this.diagnosticTimeout) {
      clearTimeout(this.diagnosticTimeout);
    }

    // より短いデバウンス時間（300ms）でリアルタイム性を向上
    this.diagnosticTimeout = setTimeout(async () => {
      try {
        await this.performDiagnostics(document);
      } catch (error) {
        console.error('[DiagnosticManager] 診断処理でエラーが発生しました:', error);
      }
    }, 300);
  }

  /**
   * 診断を実行
   */
  private async performDiagnostics(document: vscode.TextDocument): Promise<void> {
    const text = document.getText();
    const uri = document.uri.toString();
    
    // 古いキャッシュをクリーンアップ
    this.cleanupOldCache();
    
    // キャッシュサイズ制限をチェック
    if (this.validationCache.size >= this.MAX_CACHE_SIZE) {
      console.log('[DiagnosticManager] キャッシュサイズ制限に達したため、古いキャッシュをクリアします');
      this.cleanupOldCache(true); // 強制クリーンアップ
    }
    
    // キャッシュをチェック
    const cacheKey = uri;
    const cached = this.validationCache.get(cacheKey);
    if (cached && cached.content === text && Date.now() - cached.timestamp < this.CACHE_TTL) {
      this.diagnosticCollection.set(document.uri, cached.diagnostics);
      return;
    }

    // 診断を実行
    const schemaKind = this.resolveSchemaKind(document.fileName);
    await this.performValidation(document, text, schemaKind);
  }

  /**
   * 実際の検証処理を実行
   */
  private async performValidation(document: vscode.TextDocument, text: string, schemaKind: ValidationSchemaKind): Promise<void> {
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
      if (!this.schemaCaches[schemaKind] || (now - this.lastSchemaLoads[schemaKind]) > this.CACHE_TTL) {
        this.schemaCaches[schemaKind] = await this.loadSchemaByKind(schemaKind);
        this.lastSchemaLoads[schemaKind] = now;
        
        // 古いAjvインスタンスを破棄して新しいインスタンスを作成
        if (this.ajvInstance) {
          this.ajvInstance = null;
        }
        this.ajvInstance = new Ajv({ allErrors: true, allowUnionTypes: true });
      }

      if (!this.ajvInstance) {
        this.ajvInstance = new Ajv({ allErrors: true, allowUnionTypes: true });
      }
      
      const schema = this.schemaCaches[schemaKind];
      if (!schema) {
        throw new Error('スキーマキャッシュが初期化されていません');
      }

      const validate = this.ajvInstance.compile(schema);

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
    const cacheEntry = {
      content: text,
      timestamp: now,
      diagnostics: diagnostics
    };
    
    this.validationCache.set(uri, cacheEntry);

    // 診断キャッシュエントリのメモリ追跡
    const entrySize = this.estimateDiagnosticCacheSize(cacheEntry);
    this.memoryTracker.trackDiagnosticsObject(cacheEntry, entrySize, {
      uri,
      contentSize: text.length,
      diagnosticCount: diagnostics.length
    });

    this.diagnosticCollection.set(document.uri, diagnostics);
  }

  private resolveSchemaKind(fileName: string): ValidationSchemaKind {
    const lower = fileName.toLowerCase();

    if (/\.template\.(ya?ml|json)$/.test(lower)) {
      return 'template';
    }

    if (
      lower.endsWith('-theme.yml') ||
      lower.endsWith('-theme.yaml') ||
      lower.endsWith('_theme.yml') ||
      lower.endsWith('_theme.yaml') ||
      lower.endsWith('/textui-theme.yml') ||
      lower.endsWith('/textui-theme.yaml') ||
      lower.endsWith('\\textui-theme.yml') ||
      lower.endsWith('\\textui-theme.yaml') ||
      lower.endsWith('-theme.json') ||
      lower.endsWith('_theme.json') ||
      lower.endsWith('/textui-theme.json') ||
      lower.endsWith('\\textui-theme.json')
    ) {
      return 'theme';
    }

    return 'main';
  }

  private async loadSchemaByKind(schemaKind: ValidationSchemaKind): Promise<SchemaDefinition> {
    switch (schemaKind) {
      case 'template':
        if (typeof this.schemaManager.loadTemplateSchema === 'function') {
          return await this.schemaManager.loadTemplateSchema();
        }
        return await this.schemaManager.loadSchema();
      case 'theme':
        if (typeof this.schemaManager.loadThemeSchema === 'function') {
          return await this.schemaManager.loadThemeSchema();
        }
        return await this.schemaManager.loadSchema();
      case 'main':
      default:
        return await this.schemaManager.loadSchema();
    }
  }

  /**
   * エラーから診断情報を作成
   */
  private createDiagnosticsFromErrors(
    errors: ErrorObject[],
    text: string,
    document: vscode.TextDocument
  ): vscode.Diagnostic[] {
    const diagnostics: vscode.Diagnostic[] = [];

    for (const err of errors) {
      const key = err.instancePath?.split('/').filter(Boolean).pop();
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
    const uriString = uri.toString();
    this.diagnosticCollection.delete(uri);
    this.validationCache.delete(uriString);

    // 旧実装で残る uri:hash 形式のキーも削除して不整合を防ぐ
    const legacyKeyPrefix = `${uriString}:`;
    for (const cacheKey of this.validationCache.keys()) {
      if (cacheKey.startsWith(legacyKeyPrefix)) {
        this.validationCache.delete(cacheKey);
      }
    }
    
    const timeout = this.validationTimeouts.get(uriString);
    if (timeout) {
      clearTimeout(timeout);
      this.validationTimeouts.delete(uriString);
    }
  }

  /**
   * キャッシュをクリア
   */
  clearCache(): void {
    this.validationCache.clear();
    this.schemaCaches = {
      main: null,
      template: null,
      theme: null
    };
    this.lastSchemaLoads = {
      main: 0,
      template: 0,
      theme: 0
    };
    
    // Ajvインスタンスを適切に破棄
    if (this.ajvInstance) {
      this.ajvInstance = null;
    }
    
  }

  /**
   * 診断コレクションを破棄
   */
  dispose(): void {
    this.clearDiagnostics();
    
    // 診断タイマーをクリア
    if (this.diagnosticTimeout) {
      clearTimeout(this.diagnosticTimeout);
      this.diagnosticTimeout = null;
    }
    
    this.diagnosticCollection.dispose();
  }

  /**
   * 古いキャッシュをクリーンアップ
   */
  private cleanupOldCache(force: boolean = false): void {
    const now = Date.now();
    const oldCache = [];

    for (const [key, { timestamp }] of this.validationCache) {
      if (force || (now - timestamp > this.MAX_CACHE_AGE)) {
        oldCache.push(key);
      }
    }

    for (const key of oldCache) {
      this.validationCache.delete(key);
    }
  }

  /**
   * 診断キャッシュエントリのメモリサイズを推定
   */
  private estimateDiagnosticCacheSize(entry: { content: string; diagnostics: vscode.Diagnostic[]; timestamp: number }): number {
    // content文字列のサイズ（UTF-16想定）
    const contentSize = entry.content.length * 2;
    
    // timestamp数値のサイズ（8バイト）
    const timestampSize = 8;
    
    // diagnostics配列のサイズを推定
    let diagnosticsSize = 16; // 配列のベースサイズ
    for (const diagnostic of entry.diagnostics) {
      // 各診断メッセージのサイズ
      const messageSize = diagnostic.message.length * 2;
      
      // Range情報のサイズ（Position × 2 × 2プロパティ）
      const rangeSize = 16; // line, character プロパティ × 2 × 2
      
      // その他のプロパティのオーバーヘッド
      const diagnosticOverhead = 32;
      
      diagnosticsSize += messageSize + rangeSize + diagnosticOverhead;
    }
    
    // オブジェクトのオーバーヘッド
    const objectOverhead = 48;
    
    return contentSize + timestampSize + diagnosticsSize + objectOverhead;
  }
} 
