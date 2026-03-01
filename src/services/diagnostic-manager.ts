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

type DiagnosticMessageTemplate = {
  code: string;
  summary: string;
  cause: string;
  fix: string;
  severity: vscode.DiagnosticSeverity;
};

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
      const range = this.resolveDiagnosticRange(err, text, document);
      const location = this.resolveDiagnosticLocation(err);
      const template = this.buildDiagnosticTemplate(err, location);
      const message = [
        `[${template.code}] ${template.summary}`,
        `原因: ${template.cause}`,
        `修正: ${template.fix}`,
        `場所: ${location}`
      ].join('\n');

      const diag = new vscode.Diagnostic(
        range,
        message,
        template.severity
      );
      diagnostics.push(diag);
    }

    return diagnostics;
  }

  private resolveDiagnosticRange(
    error: ErrorObject,
    text: string,
    document: vscode.TextDocument
  ): vscode.Range {
    const pointerParts = (error.instancePath || '').split('/').filter(Boolean);
    const fallbackRange = new vscode.Range(0, 0, 0, 1);

    if (error.keyword === 'required') {
      const missingProperty = (error.params as { missingProperty?: string }).missingProperty;
      if (missingProperty) {
        const existingPath = [...pointerParts, missingProperty];
        const byPath = this.findRangeByPath(existingPath, text, document);
        if (byPath) {
          return byPath;
        }
      }
    }

    if (error.keyword === 'additionalProperties') {
      const additionalProperty = (error.params as { additionalProperty?: string }).additionalProperty;
      if (additionalProperty) {
        const additionalPath = [...pointerParts, additionalProperty];
        const byPath = this.findRangeByPath(additionalPath, text, document);
        if (byPath) {
          return byPath;
        }
      }
    }

    const byInstancePath = this.findRangeByPath(pointerParts, text, document);
    return byInstancePath || fallbackRange;
  }

  private findRangeByPath(pathParts: string[], text: string, document: vscode.TextDocument): vscode.Range | null {
    for (let i = pathParts.length - 1; i >= 0; i -= 1) {
      const key = pathParts[i];
      if (!key || /^\d+$/.test(key)) {
        continue;
      }

      const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`^\\s*${escapedKey}:`, 'm');
      const match = text.match(regex);
      if (!match) {
        continue;
      }

      const start = match.index ?? text.indexOf(match[0]);
      const startPos = document.positionAt(start);
      const endPos = document.positionAt(start + match[0].length);
      return new vscode.Range(startPos, endPos);
    }

    return null;
  }

  private resolveDiagnosticLocation(error: ErrorObject): string {
    const path = error.instancePath && error.instancePath.length > 0 ? error.instancePath : '/';
    if (error.keyword === 'required') {
      const missingProperty = (error.params as { missingProperty?: string }).missingProperty;
      if (missingProperty) {
        return `${path}/${missingProperty}`.replace(/\/\//g, '/');
      }
    }
    if (error.keyword === 'additionalProperties') {
      const additionalProperty = (error.params as { additionalProperty?: string }).additionalProperty;
      if (additionalProperty) {
        return `${path}/${additionalProperty}`.replace(/\/\//g, '/');
      }
    }
    return path;
  }

  private buildDiagnosticTemplate(error: ErrorObject, location: string): DiagnosticMessageTemplate {
    switch (error.keyword) {
      case 'required': {
        const missingProperty = (error.params as { missingProperty?: string }).missingProperty || 'unknown';
        return {
          code: 'TUI001',
          summary: `必須キー "${missingProperty}" が不足しています。`,
          cause: `このオブジェクトでは "${missingProperty}" が必須ですが、定義されていません。`,
          fix: `"${missingProperty}" キーを追加し、必要な値を設定してください。`,
          severity: vscode.DiagnosticSeverity.Error
        };
      }
      case 'type': {
        const expectedType = (error.params as { type?: string }).type || 'unknown';
        return {
          code: 'TUI002',
          summary: '値の型が一致していません。',
          cause: `このキーには ${expectedType} 型が必要ですが、別の型が指定されています。`,
          fix: `値を ${expectedType} 型に修正してください。`,
          severity: vscode.DiagnosticSeverity.Error
        };
      }
      case 'additionalProperties': {
        const additionalProperty = (error.params as { additionalProperty?: string }).additionalProperty || 'unknown';
        return {
          code: 'TUI003',
          summary: `未定義のキー "${additionalProperty}" が含まれています。`,
          cause: 'スキーマで定義されていないキーが指定されています。',
          fix: `キー名を見直すか、不要であれば "${additionalProperty}" を削除してください。`,
          severity: vscode.DiagnosticSeverity.Warning
        };
      }
      case 'enum': {
        const allowedValues = (error.params as { allowedValues?: unknown[] }).allowedValues;
        const allowed = Array.isArray(allowedValues) ? allowedValues.join(', ') : '定義済みの値';
        return {
          code: 'TUI004',
          summary: '許可されていない値が指定されています。',
          cause: `このキーには決められた値のみ指定できます（許可値: ${allowed}）。`,
          fix: `値を次のいずれかに変更してください: ${allowed}。`,
          severity: vscode.DiagnosticSeverity.Error
        };
      }
      default:
        return {
          code: 'TUI999',
          summary: 'DSLスキーマに一致しない記述があります。',
          cause: error.message || 'スキーマ違反が検出されました。',
          fix: '該当箇所をスキーマ定義に合わせて修正してください。',
          severity: vscode.DiagnosticSeverity.Information
        };
    }
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
