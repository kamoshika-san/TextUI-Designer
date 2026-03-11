import * as vscode from 'vscode';
import * as YAML from 'yaml';
import { ISchemaManager, SchemaDefinition } from '../types';
import { BUILT_IN_COMPONENTS } from '../registry/component-registry';
import { ConfigManager } from '../utils/config-manager';
import { COMPONENT_DESCRIPTIONS, COMPONENT_PROPERTIES } from './completion-component-catalog';
import { Logger } from '../utils/logger';

/**
 * 補完プロバイダー
 * YAML/JSONファイルのIntelliSense機能を提供
 */
export class TextUICompletionProvider implements vscode.CompletionItemProvider {
  private schemaManager: ISchemaManager;
  private schemaCache: SchemaDefinition | null = null;
  private lastSchemaLoad: number = 0;
  private completionCache: Map<string, { items: vscode.CompletionItem[]; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 10000; // 10秒
  private completionTimeout: NodeJS.Timeout | null = null;
  private readonly completionItemKindFallback: Record<'Class' | 'Property' | 'Value' | 'Module' | 'Field', number> = {
    Class: 7,
    Property: 9,
    Value: 12,
    Module: 3,
    Field: 5
  };

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
    const text = document.getText();
    const linePrefix = text.substring(document.offsetAt(this.createPosition(position.line, 0)), document.offsetAt(position));
    const currentWord = this.getCurrentWord(linePrefix);
    const isTemplate = /\.template\.(ya?ml|json)$/.test(document.fileName);
    const cacheKey = this.generateCacheKey(document, position, context, isTemplate);
    return { text, linePrefix, currentWord, isTemplate, cacheKey };
  }

  private shouldProvideCompletions(document: vscode.TextDocument, isTemplate: boolean): boolean {
    return ConfigManager.isSupportedFile(document.fileName) || isTemplate;
  }

  private getCachedCompletionItems(cacheKey: string, now: number): vscode.CompletionItem[] | undefined {
    const cached = this.completionCache.get(cacheKey);
    if (cached && (now - cached.timestamp) < this.CACHE_TTL) {
      this.logger.debug('キャッシュされた補完候補を使用');
      return cached.items;
    }
    return undefined;
  }

  private setCachedCompletionItems(cacheKey: string, items: vscode.CompletionItem[], now: number): void {
    this.completionCache.set(cacheKey, {
      items,
      timestamp: now
    });
  }

  private async parseYamlForSyntaxValidation(text: string): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      setImmediate(() => {
        try {
          YAML.parse(text);
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  private async loadSchemaWithCache(now: number): Promise<SchemaDefinition> {
    if (!this.schemaCache || (now - this.lastSchemaLoad) > this.CACHE_TTL) {
      this.schemaCache = await this.schemaManager.loadSchema();
      this.lastSchemaLoad = now;
    }
    return this.schemaCache;
  }


  private readonly logger = new Logger('CompletionProvider');

  constructor(schemaManager: ISchemaManager) {
    this.schemaManager = schemaManager;
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
      const schema = await this.loadSchemaWithCache(now);
      const items = this.generateCompletionItemsFromSchema(
        requestContext.linePrefix,
        position,
        requestContext.currentWord,
        schema,
        requestContext.isTemplate
      );

      this.setCachedCompletionItems(requestContext.cacheKey, items, now);
      return items;
    } catch (error) {
      return this.getBasicCompletions(requestContext.linePrefix, position, requestContext.currentWord);
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
    const text = document.getText();
    const linePrefix = text.substring(document.offsetAt(this.createPosition(position.line, 0)), document.offsetAt(position));
    const triggerChar = context.triggerCharacter || '';
    
    return `${document.uri.toString()}:${position.line}:${position.character}:${isTemplate}:${triggerChar}:${linePrefix}`;
  }

  /**
   * スキーマに基づく補完アイテムを生成
   */
  private generateCompletionItemsFromSchema(
    linePrefix: string,
    position: vscode.Position,
    currentWord: string,
    schema: SchemaDefinition,
    isTemplate: boolean
  ): vscode.CompletionItem[] {
    const items: vscode.CompletionItem[] = [];

    // コンテキストを解析
    const context = this.analyzeContext(linePrefix, position);
    
    switch (context.type) {
      case 'component-list':
        // コンポーネントリスト（ハイフンの後）
        items.push(...this.getComponentCompletions());
        break;
      
      case 'component-properties':
        // コンポーネントのプロパティ
        items.push(...this.getComponentPropertyCompletions(context.componentName, context.existingProperties));
        break;
      
      case 'property-value':
        // プロパティの値
        items.push(...this.getPropertyValueCompletions(context.propertyName, context.componentName));
        break;
      
      case 'root-level':
        // ルートレベル
        items.push(...this.getRootLevelCompletions(context.rootKeys));
        break;
    }

    return items;
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
    const lines = linePrefix.split('\n');
    const currentLine = lines[lines.length - 1];
    const indentLevel = this.getIndentLevel(currentLine);
    const contextMeta = this.collectContextMeta(lines, lines.length - 1, indentLevel);

    // ハイフンの後（コンポーネントリスト）
    if (currentLine.trim().endsWith('-') || currentLine.trim() === '-') {
      return { type: 'component-list' };
    }

    // ルートレベル
    if (indentLevel === 0) {
      return { type: 'root-level', rootKeys: contextMeta.rootKeys };
    }

    // プロパティ値の行（例: variant: ...）を先に判定
    const propertyMatch = currentLine.match(/^\s*(\w+):\s*(.*)$/);
    if (propertyMatch) {
      const propertyName = propertyMatch[1];
      const componentName = this.findParentComponent(lines, lines.length - 1);
      if (componentName) {
        return { type: 'property-value', propertyName, componentName, existingProperties: contextMeta.existingProperties };
      }
    }

    // コンポーネント名の行（- Text: も含む）
    const componentMatch = currentLine.match(/^-?\s*(\w+):\s*$/);
    if (componentMatch) {
      const componentName = this.findParentComponent(lines, lines.length - 1);
      if (componentName) {
        return {
          type: 'property-value',
          propertyName: componentMatch[1],
          componentName,
          existingProperties: contextMeta.existingProperties
        };
      } else {
        return {
          type: 'component-properties',
          componentName: componentMatch[1],
          existingProperties: contextMeta.existingProperties
        };
      }
    }

    // 空白行やその他の行で、親コンポーネントのプロパティ入力中
    const componentName = this.findParentComponent(lines, lines.length - 1);
    if (componentName) {
      return { type: 'component-properties', componentName, existingProperties: contextMeta.existingProperties };
    }

    return { type: 'root-level', rootKeys: contextMeta.rootKeys };
  }

  private collectContextMeta(
    lines: string[],
    currentIndex: number,
    currentIndent: number
  ): { existingProperties: Set<string>; rootKeys: Set<string> } {
    const existingProperties = new Set<string>();
    const rootKeys = new Set<string>();

    for (let i = 0; i < currentIndex; i++) {
      const line = lines[i];
      const propertyMatch = line.match(/^\s*(?:-\s*)?(\w+):/);
      if (!propertyMatch) {continue;}

      const key = propertyMatch[1];
      const indent = this.getIndentLevel(line);

      if (indent === 0) {
        rootKeys.add(key);
      }

      if (indent === currentIndent) {
        existingProperties.add(key);
      }
    }

    return { existingProperties, rootKeys };
  }

  /**
   * インデントレベルを取得
   */
  private getIndentLevel(line: string): number {
    const match = line.match(/^(\s*)/);
    return match ? match[1].length : 0;
  }

  /**
   * 親コンポーネント名を取得
   */
  private findParentComponent(lines: string[], currentIndex: number): string | undefined {
    // プロパティ行や空白行の場合、currentIndexから上に遡って最初のコンポーネント行を返す
    for (let i = currentIndex - 1; i >= 0; i--) {
      const line = lines[i];
      if (line.trim() === '') {continue;}
      const match = line.match(/^\s*-?\s*(\w+):\s*$/);
      if (match && match[1] !== 'components' && match[1] !== 'page') {
        return match[1];
      }
    }
    return undefined;
  }

  /**
   * コンポーネントの補完候補を取得
   */
  private getComponentCompletions(): vscode.CompletionItem[] {
    return BUILT_IN_COMPONENTS.map(componentName => {
      const item = this.createCompletionItem(componentName, 'Class');
      item.detail = COMPONENT_DESCRIPTIONS[componentName] || 'コンポーネント';
      item.insertText = `${componentName}:\n    `;
      item.sortText = `0${componentName}`;
      return item;
    });
  }

  /**
   * コンポーネントのプロパティ補完候補を取得
   */
  private getComponentPropertyCompletions(componentName?: string, existingProperties: Set<string> = new Set()): vscode.CompletionItem[] {
    if (!componentName) {return [];}

    const properties = this.getComponentProperties(componentName);
    const filteredProperties = properties.filter(prop => !existingProperties.has(prop.name));
    
    return filteredProperties.map(prop => {
      const item = this.createCompletionItem(prop.name, 'Property');
      item.detail = prop.description;
      item.insertText = `${prop.name}: `;
      item.sortText = `0${prop.name}`;
      return item;
    });
  }

  /**
   * プロパティの値補完候補を取得
   */
  private getPropertyValueCompletions(propertyName?: string, componentName?: string): vscode.CompletionItem[] {
    if (!propertyName || !componentName) {return [];}

    const values = this.getPropertyValues(propertyName, componentName);
    
    return values.map(val => {
      const item = this.createCompletionItem(val.value, 'Value');
      item.detail = val.description;
      item.insertText = val.value;
      item.sortText = `0${val.value}`;
      return item;
    });
  }

  /**
   * ルートレベルの補完候補を取得
   */
  private getRootLevelCompletions(existingRootKeys: Set<string> = new Set()): vscode.CompletionItem[] {
    const items: vscode.CompletionItem[] = [];

    if (existingRootKeys.has('page')) {
      return items;
    }
    
    const pageItem = this.createCompletionItem('page', 'Module');
    pageItem.detail = 'ページ定義';
    pageItem.insertText = 'page:\n  id: \n  title: \n  layout: vertical\n  components:\n    - ';
    pageItem.sortText = '0page';
    items.push(pageItem);
    
    return items;
  }

  /**
   * 基本的な補完候補を取得（YAMLパースエラー時）
   */
  private getBasicCompletions(linePrefix: string, position: vscode.Position, currentWord: string): vscode.CompletionItem[] {
    const items: vscode.CompletionItem[] = [];
    
    // 基本的なYAML構造
    const basicItems = [
      { name: 'page', description: 'ページ定義' },
      { name: 'id', description: 'ID' },
      { name: 'title', description: 'タイトル' },
      { name: 'layout', description: 'レイアウト' },
      { name: 'components', description: 'コンポーネントリスト' }
    ];
    
    basicItems.forEach(item => {
      const completionItem = this.createCompletionItem(item.name, 'Field');
      completionItem.detail = item.description;
      completionItem.insertText = `${item.name}: `;
      items.push(completionItem);
    });
    
    return items;
  }

  /**
   * コンポーネントのプロパティを取得
   */
  private getComponentProperties(componentName: string): Array<{ name: string; description: string }> {
    return (COMPONENT_PROPERTIES[componentName] || []).map(({ name, description }) => ({
      name,
      description
    }));
  }

  /**
   * プロパティの値を取得
   */
  private getPropertyValues(propertyName: string, componentName: string): Array<{ value: string; description: string }> {
    const matchedProperty = (COMPONENT_PROPERTIES[componentName] || []).find(
      property => property.name === propertyName
    );
    return matchedProperty?.values || [];
  }

  /**
   * キャッシュをクリア
   */
  clearCache(): void {
    this.completionCache.clear();
    this.schemaCache = null;
    this.lastSchemaLoad = 0;
  }

  /**
   * 現在の単語を取得
   */
  private getCurrentWord(linePrefix: string): string {
    const words = linePrefix.trim().split(/\s+/);
    return words[words.length - 1] || '';
  }

  private createPosition(line: number, character: number): vscode.Position {
    const positionCtor = (vscode as { Position?: unknown }).Position;
    if (typeof positionCtor === 'function') {
      return new vscode.Position(line, character);
    }
    return { line, character } as vscode.Position;
  }

  private getCompletionItemKind(kind: 'Class' | 'Property' | 'Value' | 'Module' | 'Field'): number {
    const completionItemKind = (vscode as unknown as { CompletionItemKind?: Record<string, number> }).CompletionItemKind;
    if (completionItemKind && typeof completionItemKind[kind] === 'number') {
      return completionItemKind[kind];
    }
    return this.completionItemKindFallback[kind];
  }

  private createCompletionItem(
    label: string,
    kind: 'Class' | 'Property' | 'Value' | 'Module' | 'Field'
  ): vscode.CompletionItem {
    const completionCtor = (vscode as { CompletionItem?: unknown }).CompletionItem;
    const resolvedKind = this.getCompletionItemKind(kind);
    if (typeof completionCtor === 'function') {
      return new vscode.CompletionItem(label, resolvedKind as vscode.CompletionItemKind);
    }
    return {
      label,
      kind: resolvedKind,
      detail: '',
      insertText: '',
      sortText: ''
    } as unknown as vscode.CompletionItem;
  }
} 
