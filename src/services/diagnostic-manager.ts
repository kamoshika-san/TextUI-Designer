import * as vscode from 'vscode';
import type { ErrorObject } from 'ajv';
import { TextUIMemoryTracker } from '../utils/textui-memory-tracker';
import type { ISchemaManager, SchemaDefinition } from '../types';
import { suggestSimilarKeys } from './diagnostics/key-suggestion';
import { buildDiagnosticTemplate } from './diagnostics/template-builder';
import { assembleDiagnosticMarkdownMessage } from './diagnostics/diagnostic-message-assembler';
import { resolveDiagnosticLocation, resolveDiagnosticRange } from './diagnostics/range-resolver';
import { SemanticDiagnosticEngine, type SemanticDiagnostic } from './diagnostics/semantic-diagnostic-engine';
import { DiagnosticCacheStore, type DiagnosticCacheEntry } from './diagnostics/diagnostic-cache-store';
import { DiagnosticScheduler, type IDiagnosticScheduler } from './diagnostics/diagnostic-scheduler';
import {
  DiagnosticValidationEngine,
  type IDiagnosticValidationEngine,
  type ValidationSchemaKind
} from './diagnostics/diagnostic-validation-engine';
import { getValidationSchemaKind } from './document-kind-resolver';
import { Logger } from '../utils/logger';

/**
 * DiagnosticManager へ注入可能な依存（ユニットテストのモック差し替え用）
 */
export type DiagnosticManagerDeps = {
  /** デバウンス用スケジューラ（省略時は {@link DiagnosticScheduler}） */
  scheduler?: IDiagnosticScheduler;
  /** スキーマ検証エンジン（省略時は {@link DiagnosticValidationEngine}） */
  validationEngine?: IDiagnosticValidationEngine;
  /** VS Code 診断コレクション（省略時は拡張が作成） */
  diagnosticCollection?: vscode.DiagnosticCollection;
};

/**
 * 診断管理サービス
 * YAML/JSONファイルのバリデーションとエラー表示を担当
 */
export class DiagnosticManager {
  private readonly logger = new Logger('DiagnosticManager');
  private diagnosticCollection: vscode.DiagnosticCollection;
  private validationCache: Map<string, DiagnosticCacheEntry> = new Map();
  private readonly CACHE_TTL = 5000; // 5秒
  private readonly DEBOUNCE_DELAY = 300;
  private readonly MAX_CACHE_SIZE = 100; // キャッシュサイズ制限
  private readonly MAX_CACHE_AGE = 30000; // 30秒でキャッシュをクリア
  private memoryTracker: TextUIMemoryTracker;
  private cacheStore: DiagnosticCacheStore;
  private scheduler: IDiagnosticScheduler;
  private validationEngine: IDiagnosticValidationEngine;
  private semanticEngine: SemanticDiagnosticEngine;

  constructor(schemaManager: ISchemaManager, deps?: DiagnosticManagerDeps) {
    this.diagnosticCollection =
      deps?.diagnosticCollection ?? vscode.languages.createDiagnosticCollection('textui-designer');
    this.memoryTracker = TextUIMemoryTracker.getInstance();
    this.cacheStore = new DiagnosticCacheStore(this.validationCache, this.MAX_CACHE_SIZE, this.MAX_CACHE_AGE);
    this.scheduler = deps?.scheduler ?? new DiagnosticScheduler();
    this.validationEngine =
      deps?.validationEngine ?? new DiagnosticValidationEngine(schemaManager, this.CACHE_TTL);
    this.semanticEngine = new SemanticDiagnosticEngine();
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
      this.logger.debug('キャッシュされた診断結果を使用');
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
    } else {
      if (result.errors && result.schema) {
        diagnostics = this.createDiagnosticsFromErrors(result.errors, text, document, result.schema);
      }

      // 意味論的診断を追加
      if (schemaKind === 'main') {
        const semanticResults = await this.semanticEngine.analyze(text);
        diagnostics.push(...this.createDiagnosticsFromSemantic(semanticResults, text, document));
      }
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
      const message = assembleDiagnosticMarkdownMessage(template, location);

      const diag = new vscode.Diagnostic(
        range,
        message,
        template.severity
      );
      diagnostics.push(diag);
    }

    return diagnostics;
  }

  /**
   * 意味論的診断情報から VS Code の診断オブジェクトを作成
   */
  private createDiagnosticsFromSemantic(
    semanticResults: SemanticDiagnostic[],
    text: string,
    document: vscode.TextDocument
  ): vscode.Diagnostic[] {
    return semanticResults.map(res => {
      const range = this.resolvePathToRange(res.path, text, document);

      const severityMap = {
        'error': vscode.DiagnosticSeverity.Error,
        'warning': vscode.DiagnosticSeverity.Warning,
        'info': vscode.DiagnosticSeverity.Information
      };

      const diag = new vscode.Diagnostic(
        range,
        `[${res.code}] ${res.message}`,
        severityMap[res.severity]
      );
      diag.code = res.code;
      return diag;
    });
  }

  /**
   * インスタンスパスをドキュメントのレンジに変換
   */
  private resolvePathToRange(path: string, text: string, document: vscode.TextDocument): vscode.Range {
    const parts = path.split('/').filter(Boolean);

    // 既存の resolveDiagnosticRange 内のロジックを流用（private メソッド経由にしたいところだが一旦手動）
    // findRangeByPath があれば良いのだが range-resolver.ts でエクスポートされていない可能性があるため、一旦 range-resolver の resolveDiagnosticRange を利用できる形を模索
    // 暫定的に range-resolver.ts で findRangeByPath をエクスポートするか、簡易的な実装をここで行う
    // 今回は簡易的なパス一致ロジックを利用

    let currentPos = 0;
    for (const part of parts) {
      if (/^\d+$/.test(part)) {
        continue;
      }
      const index = text.indexOf(`${part}:`, currentPos);
      if (index !== -1) {
        currentPos = index;
      }
    }

    if (currentPos > 0) {
      const line = document.lineAt(document.positionAt(currentPos).line);
      return line.range;
    }

    return new vscode.Range(0, 0, 0, 1);
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
