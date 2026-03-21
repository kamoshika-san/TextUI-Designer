import * as vscode from 'vscode';
import { ErrorObject } from 'ajv';
import { TextUIMemoryTracker } from '../utils/textui-memory-tracker';
import { ISchemaManager, SchemaDefinition } from '../types';
import { suggestSimilarKeys } from './diagnostics/key-suggestion';
import { buildDiagnosticTemplate } from './diagnostics/template-builder';
import { resolveDiagnosticLocation, resolveDiagnosticRange } from './diagnostics/range-resolver';
import { DiagnosticCacheStore, type DiagnosticCacheEntry } from './diagnostics/diagnostic-cache-store';
import { DiagnosticScheduler } from './diagnostics/diagnostic-scheduler';
import { DiagnosticValidationEngine, type ValidationSchemaKind } from './diagnostics/diagnostic-validation-engine';
import { getValidationSchemaKind } from './document-kind-resolver';


/**
 * 診断管理サービス
 * YAML/JSONファイルのバリデーションとエラー表示を担当
 */
export class DiagnosticManager {
  private diagnosticCollection: vscode.DiagnosticCollection;
  private validationCache: Map<string, DiagnosticCacheEntry> = new Map();
  private readonly CACHE_TTL = 5000; // 5秒
  private readonly DEBOUNCE_DELAY = 300;
  private readonly MAX_CACHE_SIZE = 100; // キャッシュサイズ制限
  private readonly MAX_CACHE_AGE = 30000; // 30秒でキャッシュをクリア
  private memoryTracker: TextUIMemoryTracker;
  private cacheStore: DiagnosticCacheStore;
  private scheduler: DiagnosticScheduler;
  private validationEngine: DiagnosticValidationEngine;

  constructor(schemaManager: ISchemaManager) {
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection('textui-designer');
    this.memoryTracker = TextUIMemoryTracker.getInstance();
    this.cacheStore = new DiagnosticCacheStore(this.validationCache, this.MAX_CACHE_SIZE, this.MAX_CACHE_AGE);
    this.scheduler = new DiagnosticScheduler();
    this.validationEngine = new DiagnosticValidationEngine(schemaManager, this.CACHE_TTL);
  }

  /**
   * 診断を実行（デバウンス付き）
   */
  async validateAndReportDiagnostics(document: vscode.TextDocument): Promise<void> {
    this.scheduler.schedule(async () => {
      await this.performDiagnostics(document);
    }, this.DEBOUNCE_DELAY);
  }

  /**
   * 診断を実行
   */
  private async performDiagnostics(document: vscode.TextDocument): Promise<void> {
    const text = document.getText();
    const uri = document.uri.toString();
    
    this.cacheStore.cleanupOldCache();
    this.cacheStore.ensureCapacity();

    const cached = this.cacheStore.getFresh(uri, text, this.CACHE_TTL);
    if (cached) {
      this.diagnosticCollection.set(document.uri, cached.diagnostics);
      return;
    }

    // 診断を実行
    const schemaKind = getValidationSchemaKind(document.fileName);
    await this.performValidation(document, text, schemaKind);
  }

  /**
   * 実際の検証処理を実行
   */
  private async performValidation(document: vscode.TextDocument, text: string, schemaKind: ValidationSchemaKind): Promise<void> {
    const uri = document.uri.toString();
    const now = Date.now();

    const cached = this.cacheStore.getFresh(uri, text, this.CACHE_TTL, now);
    if (cached) {
      console.log('[DiagnosticManager] キャッシュされた診断結果を使用');
      this.diagnosticCollection.set(document.uri, cached.diagnostics);
      return;
    }

    const result = await this.validationEngine.validateText(text, schemaKind);
    let diagnostics: vscode.Diagnostic[] = [];

    if (result.errorMessage) {
      const diag = new vscode.Diagnostic(
        new vscode.Range(0, 0, 0, 1),
        result.errorMessage,
        vscode.DiagnosticSeverity.Error
      );
      diagnostics.push(diag);
    } else if (result.errors && result.schema) {
      diagnostics = this.createDiagnosticsFromErrors(result.errors, text, document, result.schema);
    }

    const cacheEntry = {
      content: text,
      timestamp: now,
      diagnostics
    };

    this.cacheStore.set(uri, cacheEntry);

    const entrySize = this.estimateDiagnosticCacheSize(cacheEntry);
    this.memoryTracker.trackDiagnosticsObject(cacheEntry, entrySize, {
      uri,
      contentSize: text.length,
      diagnosticCount: diagnostics.length
    });

    this.diagnosticCollection.set(document.uri, diagnostics);
  }

  /**
   * エラーから診断情報を作成
   */
  private createDiagnosticsFromErrors(
    errors: ErrorObject[],
    text: string,
    document: vscode.TextDocument,
    schema: SchemaDefinition
  ): vscode.Diagnostic[] {
    const diagnostics: vscode.Diagnostic[] = [];

    for (const err of errors) {
      const range = resolveDiagnosticRange(err, text, document);
      const location = resolveDiagnosticLocation(err);
      const suggestedKeys = this.collectSuggestedKeys(err, schema);
      const template = buildDiagnosticTemplate(err, suggestedKeys);
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

  private collectSuggestedKeys(error: ErrorObject, schema: SchemaDefinition): string[] {
    if (error.keyword !== 'additionalProperties') {
      return [];
    }

    const additionalProperty = (error.params as { additionalProperty?: string }).additionalProperty || '';
    const candidateKeys = this.extractCandidateKeys(error, schema);
    return suggestSimilarKeys(additionalProperty, candidateKeys);
  }

  private extractCandidateKeys(error: ErrorObject, schema: SchemaDefinition): string[] {
    const pointerParts = (error.instancePath || '').split('/').filter(Boolean);
    const parentSchema = this.resolveSchemaNodeByPath(schema, pointerParts);
    if (!parentSchema || typeof parentSchema !== 'object') {
      return [];
    }

    const properties = (parentSchema as { properties?: Record<string, unknown> }).properties;
    if (!properties || typeof properties !== 'object') {
      return [];
    }

    return Object.keys(properties);
  }

  private resolveSchemaNodeByPath(schema: SchemaDefinition, pathParts: string[]): Record<string, unknown> | null {
    let current: Record<string, unknown> | null = schema as Record<string, unknown>;

    for (const part of pathParts) {
      if (!current) {
        return null;
      }

      if (/^\d+$/.test(part)) {
        const arrayItems = current.items as Record<string, unknown> | undefined;
        current = arrayItems || null;
        continue;
      }

      const properties = current.properties as Record<string, unknown> | undefined;
      if (properties && typeof properties === 'object' && properties[part] && typeof properties[part] === 'object') {
        current = properties[part] as Record<string, unknown>;
        continue;
      }

      return null;
    }

    return current;
  }

  /**
   * 診断コレクションをクリア
   */
  clearDiagnostics(): void {
    this.diagnosticCollection.clear();
    this.cacheStore.clear();
  }

  /**
   * 特定のURIの診断をクリア
   */
  clearDiagnosticsForUri(uri: vscode.Uri): void {
    const uriString = uri.toString();
    this.diagnosticCollection.delete(uri);
    this.cacheStore.delete(uriString);
    this.cacheStore.clearLegacyKeys(uriString);
  }

  /**
   * キャッシュをクリア
   */
  clearCache(): void {
    this.cacheStore.clear();
    this.validationEngine.clearCache();
  }

  /**
   * 診断コレクションを破棄
   */
  dispose(): void {
    this.clearDiagnostics();
    
    this.scheduler.clear();

    this.diagnosticCollection.dispose();
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
