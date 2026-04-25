import * as vscode from 'vscode';
import { ConfigManager } from '../utils/config-manager';
import { Logger } from '../utils/logger';
import { CompletionContextAnalyzer } from './completion-context-analyzer';
import { CompletionCache } from './completion-cache';
import { DescriptorCompletionEngine } from './schema-completion-engine';
import { asVscodeCompletionContext, asVscodePosition, asVscodeTextDocument } from './vscode-host-adapters';
import type {
  CancellationTokenLike,
  CompletionContextLike,
  CompletionItemLike,
  CompletionListLike,
  ICompletionProvider,
  PositionLike,
  TextDocumentLike
} from '../types';

/**
 * 補完プロバイダー（YAML/JSON の IntelliSense）。
 *
 * 候補の正本は descriptor カタログ（`DescriptorCompletionEngine` → `COMPONENT_DEFINITIONS` / `COMPONENT_PROPERTIES`）。
 * JSON Schema（`SchemaManager`）は補完経路では読み込まない（診断・バリデーション・スキーマ登録は別系統）。
 */
export class TextUICompletionProvider implements ICompletionProvider {
  private static readonly NAVIGATION_FLOW_PROPERTIES = ['id', 'title', 'entry', 'screens', 'transitions'];
  private static readonly NAVIGATION_SCREEN_PROPERTIES = ['id', 'page', 'title'];
  private static readonly NAVIGATION_TRANSITION_PROPERTIES = ['from', 'to', 'trigger', 'label', 'condition', 'params'];
  private static readonly COMPLETION_ITEM_KIND_FALLBACK: Record<string, number> = {
    Class: 7, Property: 9, Value: 12, Module: 8, Field: 4
  };
  private completionCacheService: CompletionCache;
  private contextAnalyzer: CompletionContextAnalyzer;
  /** 実装は descriptor / カタログ駆動（JSON Schema は未使用）。 */
  private descriptorEngine: DescriptorCompletionEngine;

  private completionCache: Map<string, { items: vscode.CompletionItem[]; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 10000; // 10秒
  private completionTimeout: NodeJS.Timeout | null = null;
  private readonly logger = new Logger('CompletionProvider');

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
    return ConfigManager.isSupportedFile(document.fileName)
      || ConfigManager.isNavigationFlowFile(document.fileName)
      || isTemplate;
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
    await this.descriptorEngine.parseYamlForSyntaxValidation(text);
  }

  constructor() {
    this.contextAnalyzer = new CompletionContextAnalyzer();
    this.completionCacheService = new CompletionCache(this.CACHE_TTL);
    this.descriptorEngine = new DescriptorCompletionEngine();
    this.completionCache = this.completionCacheService.getCompletionCacheMap();
  }

  /**
   * 補完を提供（デバウンス付き）
   */
  async provideCompletionItems(
    document: TextDocumentLike,
    position: PositionLike,
    _token: CancellationTokenLike,
    context: CompletionContextLike
  ): Promise<CompletionItemLike[] | CompletionListLike<CompletionItemLike>> {
    const vsDocument = asVscodeTextDocument(document);
    const vsPosition = asVscodePosition(position);
    const vsContext = asVscodeCompletionContext(context);
    // 既存のタイマーをクリア
    if (this.completionTimeout) {
      clearTimeout(this.completionTimeout);
    }

    // より短いデバウンス時間（150ms）でリアルタイム性を向上
    return new Promise((resolve) => {
      this.completionTimeout = setTimeout(async () => {
        try {
          const items = await this.generateCompletionItems(vsDocument, vsPosition, vsContext);
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

      let items: vscode.CompletionItem[];
      if (ConfigManager.isNavigationFlowFile(document.fileName)) {
        items = this.generateNavigationFlowCompletionItems(requestContext.text, position);
      } else {
        const analysisContext = this.analyzeContext(requestContext.linePrefix, position);
        // action.trigger 補完: Button の trigger プロパティ値として、
        // ワークスペース内のフローファイルから trigger 名を収集して提案する
        if (
          analysisContext.type === 'property-value' &&
          analysisContext.propertyName === 'trigger' &&
          analysisContext.componentName === 'Button'
        ) {
          items = await this.getActionTriggerCompletions(document);
        } else {
          items = this.generateCompletionItemsFromDescriptors(analysisContext);
        }
      }

      this.setCachedCompletionItems(requestContext.cacheKey, items, now);
      return items;
    } catch (error) {
      return ConfigManager.isNavigationFlowFile(document.fileName)
        ? this.getNavigationFlowBasicCompletions()
        : this.getBasicCompletions();
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
   * descriptor カタログに基づく補完アイテムを生成
   */
  private generateCompletionItemsFromDescriptors(
    analysisContext: {
      type: 'component-list' | 'component-properties' | 'property-value' | 'root-level';
      componentName?: string;
      propertyName?: string;
      existingProperties?: Set<string>;
      rootKeys?: Set<string>;
    }
  ): vscode.CompletionItem[] {
    return this.descriptorEngine.generateCompletionItemsFromDescriptors(analysisContext);
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
    return this.descriptorEngine.getComponentCompletions();
  }

  /**
   * コンポーネントのプロパティ補完候補を取得
   */
  private getComponentPropertyCompletions(componentName?: string, existingProperties: Set<string> = new Set()): vscode.CompletionItem[] {
    return this.descriptorEngine.getComponentPropertyCompletions(componentName, existingProperties);
  }

  /**
   * プロパティの値補完候補を取得
   */
  private getPropertyValueCompletions(propertyName?: string, componentName?: string): vscode.CompletionItem[] {
    return this.descriptorEngine.getPropertyValueCompletions(propertyName, componentName);
  }

  /**
   * ルートレベルの補完候補を取得
   */
  private getRootLevelCompletions(existingRootKeys: Set<string> = new Set()): vscode.CompletionItem[] {
    return this.descriptorEngine.getRootLevelCompletions(existingRootKeys);
  }

  /**
   * 基本的な補完候補を取得（YAMLパースエラー時）
   */
  private getBasicCompletions(): vscode.CompletionItem[] {
    return this.descriptorEngine.getBasicCompletions();
  }

  private generateNavigationFlowCompletionItems(text: string, position: vscode.Position): vscode.CompletionItem[] {
    const context = this.getNavigationFlowContext(text, position);
    const screenIds = this.collectNavigationScreenIds(text);

    if (context.type === 'property-value' && (context.propertyName === 'entry' || context.propertyName === 'from' || context.propertyName === 'to')) {
      return screenIds.map(id => this.createNavigationValueCompletion(id, 'Existing screen id'));
    }

    if (context.type === 'root-level') {
      return this.getNavigationFlowRootCompletions(context.existingProperties);
    }

    if (context.type === 'flow-properties') {
      return this.getNavigationPropertyCompletions(TextUICompletionProvider.NAVIGATION_FLOW_PROPERTIES, context.existingProperties);
    }

    if (context.type === 'screen-properties') {
      return this.getNavigationPropertyCompletions(TextUICompletionProvider.NAVIGATION_SCREEN_PROPERTIES, context.existingProperties);
    }

    if (context.type === 'transition-properties') {
      return this.getNavigationPropertyCompletions(TextUICompletionProvider.NAVIGATION_TRANSITION_PROPERTIES, context.existingProperties);
    }

    return this.getNavigationFlowBasicCompletions();
  }

  private getNavigationFlowBasicCompletions(): vscode.CompletionItem[] {
    return [
      ...this.getNavigationFlowRootCompletions(new Set()),
      ...this.getNavigationPropertyCompletions(TextUICompletionProvider.NAVIGATION_FLOW_PROPERTIES, new Set())
    ];
  }

  private getNavigationFlowRootCompletions(existingProperties: Set<string>): vscode.CompletionItem[] {
    if (existingProperties.has('flow')) {
      return [];
    }

    const item = this.createCompletionItem('flow', 'Module');
    item.detail = 'Navigation flow root';
    item.insertText = 'flow:\n  id: \n  title: \n  entry: \n  screens:\n    - id: \n      page: \n  transitions:\n    - from: \n      to: \n      trigger: \n';
    item.sortText = '0flow';
    return [item];
  }

  private getNavigationPropertyCompletions(properties: string[], existingProperties: Set<string>): vscode.CompletionItem[] {
    return properties
      .filter(property => !existingProperties.has(property))
      .map(property => {
        const item = this.createCompletionItem(property, 'Property');
        item.detail = `Navigation flow ${property}`;
        item.insertText = property === 'params' ? 'params:\n        - ' : `${property}: `;
        item.sortText = `0${property}`;
        return item;
      });
  }

  private createNavigationValueCompletion(value: string, detail: string): vscode.CompletionItem {
    const item = this.createCompletionItem(value, 'Value');
    item.detail = detail;
    item.insertText = value;
    item.sortText = `0${value}`;
    return item;
  }

  private collectNavigationScreenIds(text: string): string[] {
    const ids = new Set<string>();
    const lines = text.split(/\r?\n/);
    let inScreens = false;
    let itemIndent = -1;

    for (const line of lines) {
      const indent = this.getIndentLevel(line);
      const trimmed = line.trim();

      if (indent <= 2 && /^screens:\s*$/.test(trimmed)) {
        inScreens = true;
        itemIndent = -1;
        continue;
      }

      if (indent <= 2 && /^transitions:\s*$/.test(trimmed)) {
        inScreens = false;
      }

      if (!inScreens) {
        continue;
      }

      const itemMatch = line.match(/^(\s*)-\s*id:\s*(.+?)\s*$/);
      if (itemMatch) {
        itemIndent = itemMatch[1].length;
        ids.add(itemMatch[2].trim().replace(/^["']|["']$/g, ''));
        continue;
      }

      const nestedMatch = itemIndent >= 0 && indent > itemIndent
        ? line.match(/^\s*id:\s*(.+?)\s*$/)
        : null;
      if (nestedMatch) {
        ids.add(nestedMatch[1].trim().replace(/^["']|["']$/g, ''));
      }
    }

    return Array.from(ids);
  }

  private getNavigationFlowContext(
    text: string,
    position: vscode.Position
  ): {
    type: 'root-level' | 'flow-properties' | 'screen-properties' | 'transition-properties' | 'property-value';
    propertyName?: string;
    existingProperties: Set<string>;
  } {
    const lines = text.split(/\r?\n/);
    const currentLine = (lines[position.line] ?? '').slice(0, position.character);
    const currentIndent = this.getIndentLevel(currentLine);
    const propertyMatch = currentLine.match(/^\s*(?:-\s*)?(\w+):\s*(.*)$/);
    const parentSection = this.findNavigationParentSection(lines, position.line);

    if (propertyMatch) {
      return {
        type: 'property-value',
        propertyName: propertyMatch[1],
        existingProperties: this.collectNavigationExistingProperties(lines, position.line, currentIndent, parentSection)
      };
    }

    if (currentIndent === 0) {
      return {
        type: 'root-level',
        existingProperties: this.collectNavigationExistingProperties(lines, position.line, currentIndent, parentSection)
      };
    }

    if (parentSection === 'screens') {
      return {
        type: 'screen-properties',
        existingProperties: this.collectNavigationExistingProperties(lines, position.line, currentIndent, parentSection)
      };
    }

    if (parentSection === 'transitions') {
      return {
        type: 'transition-properties',
        existingProperties: this.collectNavigationExistingProperties(lines, position.line, currentIndent, parentSection)
      };
    }

    return {
      type: 'flow-properties',
      existingProperties: this.collectNavigationExistingProperties(lines, position.line, currentIndent, parentSection)
    };
  }

  private findNavigationParentSection(lines: string[], currentIndex: number): 'screens' | 'transitions' | 'flow' | undefined {
    for (let i = currentIndex; i >= 0; i--) {
      const line = lines[i];
      const trimmed = line.trim();
      const indent = this.getIndentLevel(line);

      if (indent === 2 && trimmed === 'screens:') {
        return 'screens';
      }
      if (indent === 2 && trimmed === 'transitions:') {
        return 'transitions';
      }
      if (indent === 0 && trimmed === 'flow:') {
        return 'flow';
      }
    }
    return undefined;
  }

  private collectNavigationExistingProperties(
    lines: string[],
    currentIndex: number,
    currentIndent: number,
    parentSection?: 'screens' | 'transitions' | 'flow'
  ): Set<string> {
    const existingProperties = new Set<string>();
    let currentBlockIndent = -1;

    for (let i = 0; i < currentIndex; i++) {
      const line = lines[i];
      const match = line.match(/^(\s*)(?:-\s*)?(\w+):/);
      if (!match) {
        continue;
      }

      const indent = match[1].length;
      const key = match[2];

      if (parentSection === 'flow' && indent === 2) {
        existingProperties.add(key);
      }

      if ((parentSection === 'screens' || parentSection === 'transitions') && indent >= 4) {
        if (/^\s*-\s*/.test(line)) {
          currentBlockIndent = indent;
          existingProperties.clear();
        }
        if (currentBlockIndent >= 0 && indent >= currentBlockIndent) {
          existingProperties.add(key);
        }
      }

      if (currentIndent === 0 && indent === 0) {
        existingProperties.add(key);
      }
    }

    return existingProperties;
  }

  private createCompletionItem(label: string, kind: 'Class' | 'Property' | 'Value' | 'Module' | 'Field'): vscode.CompletionItem {
    const completionCtor = (vscode as { CompletionItem?: unknown }).CompletionItem;
    const completionItemKind = (vscode as unknown as { CompletionItemKind?: Record<string, number> }).CompletionItemKind;
    const resolvedKind = completionItemKind && typeof completionItemKind[kind] === 'number'
      ? completionItemKind[kind]
      : TextUICompletionProvider.COMPLETION_ITEM_KIND_FALLBACK[kind];
    if (typeof completionCtor === 'function') {
      return new vscode.CompletionItem(label, resolvedKind as vscode.CompletionItemKind);
    }
    return { label, kind: resolvedKind, detail: '', insertText: '', sortText: '' } as unknown as vscode.CompletionItem;
  }

  /**
   * キャッシュをクリア
   */
  clearCache(): void {
    this.completionCacheService.clear();
    this.completionCache = this.completionCacheService.getCompletionCacheMap();
  }

  /**
   * action.trigger 補完候補を生成する。
   * ワークスペース内のフローファイル（*.tui.flow.yml）から transitions[*].trigger 値を収集して返す。
   * フローファイルが見つからない場合は空配列を返す（静かに無視）。
   */
  private async getActionTriggerCompletions(_document: vscode.TextDocument): Promise<vscode.CompletionItem[]> {
    try {
      const workspaceFolders = (vscode as unknown as { workspace?: { workspaceFolders?: Array<{ uri: { fsPath: string } }> } }).workspace?.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) { return []; }

      const { workspace } = vscode as unknown as { workspace: { findFiles: (pattern: string) => Promise<Array<{ fsPath: string }>> } };
      const flowFiles = await workspace.findFiles('**/*.tui.flow.yml');
      if (!flowFiles || flowFiles.length === 0) { return []; }

      const triggers = new Set<string>();
      const fs = await import('fs');

      for (const file of flowFiles) {
        try {
          const content = fs.readFileSync(file.fsPath, 'utf8');
          // transitions[*].trigger を正規表現で収集
          const matches = content.matchAll(/^\s+trigger:\s+["']?([^"'\n\r]+)["']?\s*$/gm);
          for (const match of matches) {
            const val = match[1].trim();
            if (val) { triggers.add(val); }
          }
        } catch {
          // ファイル読み込み失敗は無視
        }
      }

      return Array.from(triggers).map(trigger => {
        const item = this.createCompletionItem(trigger, 'Value');
        item.detail = 'flow trigger';
        return item;
      });
    } catch {
      return [];
    }
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
