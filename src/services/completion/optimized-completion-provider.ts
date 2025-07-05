import * as vscode from 'vscode';
import * as YAML from 'yaml';
import { ISchemaManager } from '../../types';
import { CompletionContextAnalyzer, CompletionContext } from './completion-context-analyzer';
import { ComponentDefinitions } from './component-definitions';
import { CompletionCache } from './completion-cache';

/**
 * 最適化された補完プロバイダー
 * 効率的なキャッシュと構造化されたコンポーネント定義を使用
 */
export class OptimizedCompletionProvider implements vscode.CompletionItemProvider {
  private schemaManager: ISchemaManager;
  private contextAnalyzer: CompletionContextAnalyzer;
  private cache: CompletionCache;
  private completionTimeout: NodeJS.Timeout | null = null;

  constructor(schemaManager: ISchemaManager) {
    this.schemaManager = schemaManager;
    this.contextAnalyzer = new CompletionContextAnalyzer();
    this.cache = new CompletionCache(10000, 100);
  }

  /**
   * 補完を提供（デバウンス付き）
   */
  async provideCompletionItems(
    document: any, // TextDocument互換 or テスト用モック
    position: any, // Position互換 or {line, character}
    token: any,
    context: any
  ): Promise<any[]> {
    // 既存のタイマーをクリア
    if (this.completionTimeout) {
      clearTimeout(this.completionTimeout);
    }

    // .tui.yml/.tui.yaml以外は補完しない
    if (!document.fileName.match(/\.tui\.ya?ml$/)) return [];

    const text = document.getText();
    const linePrefix = text.substring(0, document.offsetAt(position));
    const completionContext = this.contextAnalyzer.analyze(linePrefix, position);

    // component-listコンテキストなら全コンポーネント候補を返す
    if (completionContext.type === 'component-list') {
      return ComponentDefinitions.getAllComponents().map(c => ({
        label: c.name,
        kind: 7,
        detail: c.description,
        insertText: c.insertText
      }));
    }

    return new Promise((resolve) => {
      this.completionTimeout = setTimeout(async () => {
        try {
          const items = await this.generateCompletionItems(document, position, context);
          resolve(items);
        } catch (error) {
          console.error('[OptimizedCompletionProvider] 補完処理でエラーが発生しました:', error);
          resolve([]);
        }
      }, 150);
    });
  }

  /**
   * 補完アイテムを生成
   */
  private async generateCompletionItems(
    document: any,
    position: any,
    context: any
  ): Promise<any[]> {
    const isTemplate = /\.template\.(ya?ml|json)$/.test(document.fileName);
    if (!document.fileName.endsWith('.tui.yml') && !isTemplate) {
      return [];
    }
    const cacheKey = this.cache.generateKey(document, position, context, isTemplate);
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }
    try {
      const text = document.getText();
      const linePrefix = text.substring(
        document.offsetAt({ line: position.line, character: 0 }),
        document.offsetAt(position)
      );
      const yaml = await this.parseYamlAsync(text);
      const completionContext = this.contextAnalyzer.analyze(linePrefix, position);
      const items = this.generateCompletionItemsFromContext(completionContext, document, isTemplate);
      this.cache.set(cacheKey, items);
      return items;
    } catch (error) {
      return this.getBasicCompletions();
    }
  }

  /**
   * YAMLを非同期でパース
   */
  private async parseYamlAsync(text: string): Promise<any> {
    return new Promise((resolve, reject) => {
      setImmediate(() => {
        try {
          const parsed = YAML.parse(text);
          resolve(parsed);
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  /**
   * コンテキストに基づいて補完候補を生成
   */
  private generateCompletionItemsFromContext(
    context: CompletionContext,
    document: any,
    isTemplate: boolean
  ): any[] {
    switch (context.type) {
      case 'component-list':
        return this.getComponentCompletions(document, isTemplate);
      case 'component-properties':
        return this.getComponentPropertyCompletions(context.componentName);
      case 'property-value':
        return this.getPropertyValueCompletions(context.propertyName, context.componentName);
      case 'root-level':
        return this.getRootLevelCompletions();
      default:
        return [];
    }
  }

  /**
   * コンポーネントの補完候補を取得
   */
  private getComponentCompletions(document: any, isTemplate: boolean): any[] {
    const items: any[] = [];

    // 通常のコンポーネント
    const components = ComponentDefinitions.getAllComponents();
    components.forEach(comp => {
      items.push({
        label: comp.name,
        kind: 7,
        detail: comp.description,
        insertText: comp.insertText,
        sortText: `0${comp.name}`
      });
    });

    // テンプレートファイルでない場合のみ$includeを追加
    if (!isTemplate) {
      const templateComponents = ComponentDefinitions.getTemplateComponents();
      templateComponents.forEach(comp => {
        items.push({
          label: comp.name,
          kind: 7, // Module kind for $include
          detail: comp.description,
          insertText: new vscode.SnippetString(comp.insertText),
          sortText: `0${comp.name}`
        });
      });
    }

    // テンプレートファイルの場合のみ$ifと$foreachを追加
    if (isTemplate) {
      const conditionalComponents = ComponentDefinitions.getTemplateComponents().filter(
        comp => comp.name === '$if' || comp.name === '$foreach'
      );
      conditionalComponents.forEach(comp => {
        items.push({
          label: comp.name,
          kind: 10, // Keyword kind for $if and $foreach
          detail: comp.description,
          insertText: new vscode.SnippetString(comp.insertText),
          sortText: `0${comp.name}`
        });
      });
    }

    return items;
  }

  /**
   * コンポーネントのプロパティ補完候補を取得
   */
  private getComponentPropertyCompletions(componentName?: string): any[] {
    if (!componentName) return [];

    const properties = ComponentDefinitions.getComponentProperties(componentName);
    
    return properties.map(prop => ({
      label: prop.name,
      kind: 9,
      detail: prop.description,
      insertText: `${prop.name}: `,
      sortText: `0${prop.name}`
    }));
  }

  /**
   * プロパティの値補完候補を取得
   */
  private getPropertyValueCompletions(propertyName?: string, componentName?: string): any[] {
    if (!propertyName) return [];

    const values = ComponentDefinitions.getPropertyValues(propertyName);
    
    return values.map(val => ({
      label: val.value,
      kind: 12,
      detail: val.description,
      insertText: val.value,
      sortText: `0${val.value}`
    }));
  }

  /**
   * ルートレベルの補完候補を取得
   */
  private getRootLevelCompletions(): any[] {
    return [];
  }

  /**
   * 基本的な補完候補を取得（YAMLパースエラー時）
   */
  private getBasicCompletions(): any[] {
    return [];
  }

  /**
   * キャッシュをクリア
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * キャッシュ統計を取得
   */
  getCacheStats(): { size: number; maxSize: number; hitRate: number } {
    return this.cache.getStats();
  }
} 