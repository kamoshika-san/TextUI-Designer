import * as vscode from 'vscode';
import { ISchemaManager, SchemaDefinition } from '../types';
import { ConfigManager } from '../utils/config-manager';
import { Logger } from '../utils/logger';
import { CompletionContextAnalyzer } from './completion-context-analyzer';
import { CompletionCache } from './completion-cache';
import { SchemaCompletionEngine } from './schema-completion-engine';

/**
 * 補完プロバイダー
 * YAML/JSONファイルのIntelliSense機能を提供
 */
export class TextUICompletionProvider implements vscode.CompletionItemProvider {
  private schemaManager: ISchemaManager;
  private completionCacheService: CompletionCache;
  private contextAnalyzer: CompletionContextAnalyzer;
  private schemaEngine: SchemaCompletionEngine;

  private schemaCache: SchemaDefinition | null = null;
  private lastSchemaLoad: number = 0;
  private completionCache: Map<string, { items: vscode.CompletionItem[]; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 10000; // 10秒
  private completionTimeout: NodeJS.Timeout | null = null;

  private buildCompletionRequestContext(
    document: vscode.TextDocument,
    position: vscode.Position,
    context: vscode.CompletionContext
  ): {
    text: string;
    linePrefix: string;
    currentWord: string;
    isTemplate: boolean;
    cacheKey: string;
  } {
    return this.contextAnalyzer.buildCompletionRequestContext(document, position, context, this.createPosition.bind(this));
  }

  private shouldProvideCompletions(document: vscode.TextDocument, isTemplate: boolean): boolean {
    return ConfigManager.isSupportedFile(document.fileName) || isTemplate;
  }

  private getCachedCompletionItems(cacheKey: string, now: number): vscode.CompletionItem[] | undefined {
    const cached = this.completionCacheService.getCachedCompletionItems(cacheKey, now);
    if (cached) {
      this.logger.debug('キャッシュされた補完候補を使用');
      return cached;
    }
    return undefined;
  }

  private setCachedCompletionItems(cacheKey: string, items: vscode.CompletionItem[], now: number): void {
    this.completionCacheService.setCachedCompletionItems(cacheKey, items, now);
  }

  private async parseYamlForSyntaxValidation(text: string): Promise<void> {
    await this.schemaEngine.parseYamlForSyntaxValidation(text);
  }

  private async loadSchemaWithCache(now: number): Promise<SchemaDefinition> {
    this.schemaCache = await this.completionCacheService.loadSchemaWithCache(now);
    this.lastSchemaLoad = this.completionCacheService.getLastSchemaLoad();
    return this.schemaCache;
  }


  private readonly logger = new Logger('CompletionProvider');

  constructor(schemaManager: ISchemaManager) {
    this.schemaManager = schemaManager;
    this.contextAnalyzer = new CompletionContextAnalyzer();
    this.completionCacheService = new CompletionCache(this.schemaManager, this.CACHE_TTL);
    this.schemaEngine = new SchemaCompletionEngine();
    this.completionCache = this.completionCacheService.getCompletionCacheMap();
  }

  /**
   * 補完を提供（デバウンス付き）
   */
  async provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
    context: vscode.CompletionContext
  ): Promise<vscode.CompletionItem[] | vscode.CompletionList<vscode.CompletionItem>> {
    // 既存のタイマーをクリア
    if (this.completionTimeout) {
      clearTimeout(this.completionTimeout);
    }

    // より短いデバウンス時間（150ms）でリアルタイム性を向上
    return new Promise((resolve) => {
      this.completionTimeout = setTimeout(async () => {
        try {
          const items = await this.generateCompletionItems(document, position, context);
          resolve(items);
        } catch (error) {
          this.logger.error('補完処理でエラーが発生しました:', error);
          resolve([]);
        }
      }, 150);
    });
  }

  /**
   * 補完アイテムを生成
   */
  private async generateCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    context: vscode.CompletionContext
  ): Promise<vscode.CompletionItem[] | vscode.CompletionList<vscode.CompletionItem>> {
    const requestContext = this.buildCompletionRequestContext(document, position, context);

    if (!this.shouldProvideCompletions(document, requestContext.isTemplate)) {
      return [];
    }

    try {
      const now = Date.now();
      const cachedItems = this.getCachedCompletionItems(requestContext.cacheKey, now);
      if (cachedItems) {
        return cachedItems;
      }

      await this.parseYamlForSyntaxValidation(requestContext.text);
      await this.loadSchemaWithCache(now);
      const analysisContext = this.analyzeContext(requestContext.linePrefix, position);
      const items = this.generateCompletionItemsFromSchema(analysisContext);

      this.setCachedCompletionItems(requestContext.cacheKey, items, now);
      return items;
    } catch (error) {
      return this.getBasicCompletions();
    }
  }

  /**
   * キャッシュキーを生成
   */
  private generateCacheKey(
    document: vscode.TextDocument, 
    position: vscode.Position, 
    context: vscode.CompletionContext,
    isTemplate: boolean
  ): string {
    return this.contextAnalyzer.generateCacheKey(document, position, context, isTemplate, this.createPosition.bind(this));
  }

  /**
   * スキーマに基づく補完アイテムを生成
   */
  private generateCompletionItemsFromSchema(
    analysisContext: {
      type: 'component-list' | 'component-properties' | 'property-value' | 'root-level';
      componentName?: string;
      propertyName?: string;
      existingProperties?: Set<string>;
      rootKeys?: Set<string>;
    }
  ): vscode.CompletionItem[] {
    return this.schemaEngine.generateCompletionItemsFromSchema(analysisContext);
  }

  /**
   * コンテキストを解析
   */
  private analyzeContext(linePrefix: string, position: vscode.Position): {
    type: 'component-list' | 'component-properties' | 'property-value' | 'root-level';
    componentName?: string;
    propertyName?: string;
    existingProperties?: Set<string>;
    rootKeys?: Set<string>;
  } {
    return this.contextAnalyzer.analyzeContext(linePrefix, position);
  }

  private collectContextMeta(
    lines: string[],
    currentIndex: number,
    currentIndent: number
  ): { existingProperties: Set<string>; rootKeys: Set<string> } {
    return this.contextAnalyzer.collectContextMeta(lines, currentIndex, currentIndent);
  }

  /**
   * インデントレベルを取得
   */
  private getIndentLevel(line: string): number {
    return this.contextAnalyzer.getIndentLevel(line);
  }

  /**
   * 親コンポーネント名を取得
   */
  private findParentComponent(lines: string[], currentIndex: number): string | undefined {
    return this.contextAnalyzer.findParentComponent(lines, currentIndex);
  }

  /**
   * コンポーネントの補完候補を取得
   */
  private getComponentCompletions(): vscode.CompletionItem[] {
    return this.schemaEngine.getComponentCompletions();
  }

  /**
   * コンポーネントのプロパティ補完候補を取得
   */
  private getComponentPropertyCompletions(componentName?: string, existingProperties: Set<string> = new Set()): vscode.CompletionItem[] {
    return this.schemaEngine.getComponentPropertyCompletions(componentName, existingProperties);
  }

  /**
   * プロパティの値補完候補を取得
   */
  private getPropertyValueCompletions(propertyName?: string, componentName?: string): vscode.CompletionItem[] {
    return this.schemaEngine.getPropertyValueCompletions(propertyName, componentName);
  }

  /**
   * ルートレベルの補完候補を取得
   */
  private getRootLevelCompletions(existingRootKeys: Set<string> = new Set()): vscode.CompletionItem[] {
    return this.schemaEngine.getRootLevelCompletions(existingRootKeys);
  }

  /**
   * 基本的な補完候補を取得（YAMLパースエラー時）
   */
  private getBasicCompletions(): vscode.CompletionItem[] {
    return this.schemaEngine.getBasicCompletions();
  }

  /**
   * キャッシュをクリア
   */
  clearCache(): void {
    this.completionCacheService.clear();
    this.completionCache = this.completionCacheService.getCompletionCacheMap();
    this.schemaCache = this.completionCacheService.getSchemaCache();
    this.lastSchemaLoad = this.completionCacheService.getLastSchemaLoad();
  }

  /**
   * 現在の単語を取得
   */
  private getCurrentWord(linePrefix: string): string {
    return this.contextAnalyzer.getCurrentWord(linePrefix);
  }

  private createPosition(line: number, character: number): vscode.Position {
    const positionCtor = (vscode as { Position?: unknown }).Position;
    if (typeof positionCtor === 'function') {
      return new vscode.Position(line, character);
    }
    return { line, character } as vscode.Position;
  }
}
