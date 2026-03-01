import * as vscode from 'vscode';
import * as YAML from 'yaml';
import { ISchemaManager, SchemaDefinition } from '../types';
import { BUILT_IN_COMPONENTS } from '../registry/component-registry';
import { ConfigManager } from '../utils/config-manager';

type CompletionValue = { value: string; description: string };
type ComponentProperty = { name: string; description: string; values?: CompletionValue[] };

const BOOLEAN_VALUES: CompletionValue[] = [
  { value: 'true', description: '有効' },
  { value: 'false', description: '無効' }
];

const COMPONENT_DESCRIPTIONS: Record<string, string> = {
  Text: 'テキストコンポーネント',
  Input: '入力フィールド',
  Button: 'ボタン',
  Checkbox: 'チェックボックス',
  Radio: 'ラジオボタン',
  Select: 'セレクトボックス',
  Divider: '区切り線',
  Alert: 'アラート',
  Container: 'コンテナ',
  Form: 'フォーム'
};

const COMPONENT_PROPERTIES: Record<string, ComponentProperty[]> = {
  Text: [
    {
      name: 'variant',
      description: 'テキスト種別',
      values: [
        { value: 'h1', description: '見出し1' },
        { value: 'h2', description: '見出し2' },
        { value: 'h3', description: '見出し3' },
        { value: 'p', description: '段落' },
        { value: 'small', description: '小さいテキスト' },
        { value: 'caption', description: 'キャプション' }
      ]
    },
    { name: 'value', description: '表示テキスト' },
    {
      name: 'size',
      description: 'テキストサイズ',
      values: [
        { value: 'xs', description: '極小' },
        { value: 'sm', description: '小' },
        { value: 'base', description: '標準' },
        { value: 'lg', description: '大' },
        { value: 'xl', description: '特大' },
        { value: '2xl', description: '2倍サイズ' }
      ]
    },
    {
      name: 'weight',
      description: 'フォントウェイト',
      values: [
        { value: 'normal', description: '標準' },
        { value: 'medium', description: '中' },
        { value: 'semibold', description: 'やや太字' },
        { value: 'bold', description: '太字' }
      ]
    },
    {
      name: 'color',
      description: 'テキストカラー',
      values: [
        { value: 'text-gray-300', description: 'グレー300' },
        { value: 'text-gray-400', description: 'グレー400' },
        { value: 'text-gray-500', description: 'グレー500' },
        { value: 'text-gray-600', description: 'グレー600' },
        { value: 'text-gray-700', description: 'グレー700' },
        { value: 'text-gray-900', description: 'グレー900' }
      ]
    }
  ],
  Input: [
    { name: 'label', description: '入力ラベル' },
    { name: 'name', description: '入力名' },
    {
      name: 'type',
      description: '入力タイプ',
      values: [
        { value: 'text', description: 'テキスト' },
        { value: 'email', description: 'メールアドレス' },
        { value: 'password', description: 'パスワード' },
        { value: 'number', description: '数値' },
        { value: 'multiline', description: '複数行テキスト' }
      ]
    },
    { name: 'placeholder', description: 'プレースホルダー' },
    { name: 'required', description: '必須入力', values: BOOLEAN_VALUES },
    { name: 'disabled', description: '無効化', values: BOOLEAN_VALUES },
    { name: 'multiline', description: '複数行入力', values: BOOLEAN_VALUES }
  ],
  Button: [
    {
      name: 'kind',
      description: 'ボタン種別',
      values: [
        { value: 'primary', description: 'プライマリ' },
        { value: 'secondary', description: 'セカンダリ' },
        { value: 'submit', description: '送信ボタン' }
      ]
    },
    { name: 'label', description: 'ボタンラベル' },
    { name: 'submit', description: '送信ボタンとして扱う', values: BOOLEAN_VALUES },
    { name: 'disabled', description: '無効化', values: BOOLEAN_VALUES },
    {
      name: 'size',
      description: 'ボタンサイズ',
      values: [
        { value: 'sm', description: '小' },
        { value: 'md', description: '標準' },
        { value: 'lg', description: '大' }
      ]
    }
  ],
  Checkbox: [
    { name: 'label', description: '表示ラベル' },
    { name: 'name', description: '入力名' },
    { name: 'checked', description: 'チェック状態', values: BOOLEAN_VALUES },
    { name: 'disabled', description: '無効化', values: BOOLEAN_VALUES }
  ],
  Radio: [
    { name: 'label', description: '表示ラベル' },
    { name: 'name', description: 'グループ名' },
    { name: 'value', description: '値' },
    { name: 'checked', description: '選択状態', values: BOOLEAN_VALUES },
    { name: 'disabled', description: '無効化', values: BOOLEAN_VALUES },
    { name: 'options', description: '選択肢配列' }
  ],
  Select: [
    { name: 'label', description: '表示ラベル' },
    { name: 'name', description: '入力名' },
    { name: 'options', description: '選択肢配列' },
    { name: 'placeholder', description: 'プレースホルダー' },
    { name: 'disabled', description: '無効化', values: BOOLEAN_VALUES },
    { name: 'multiple', description: '複数選択', values: BOOLEAN_VALUES }
  ],
  Divider: [
    {
      name: 'orientation',
      description: '区切り線の向き',
      values: [
        { value: 'horizontal', description: '水平' },
        { value: 'vertical', description: '垂直' }
      ]
    },
    {
      name: 'spacing',
      description: '区切りの余白',
      values: [
        { value: 'sm', description: '小' },
        { value: 'md', description: '標準' },
        { value: 'lg', description: '大' }
      ]
    }
  ],
  Alert: [
    {
      name: 'variant',
      description: 'アラート種別',
      values: [
        { value: 'info', description: '情報' },
        { value: 'success', description: '成功' },
        { value: 'warning', description: '警告' },
        { value: 'error', description: 'エラー' }
      ]
    },
    { name: 'message', description: 'メッセージ本文' },
    { name: 'title', description: 'タイトル' }
  ],
  Container: [
    {
      name: 'layout',
      description: 'レイアウト',
      values: [
        { value: 'vertical', description: '縦並び' },
        { value: 'horizontal', description: '横並び' },
        { value: 'flex', description: 'フレックス' },
        { value: 'grid', description: 'グリッド' }
      ]
    },
    { name: 'components', description: '子コンポーネント配列' }
  ],
  Form: [
    { name: 'id', description: 'フォームID' },
    { name: 'fields', description: '入力フィールド配列' },
    { name: 'actions', description: 'アクション配列' }
  ]
};

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
          console.error('[CompletionProvider] 補完処理でエラーが発生しました:', error);
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
    const text = document.getText();
    const linePrefix = text.substring(document.offsetAt(new vscode.Position(position.line, 0)), document.offsetAt(position));
    const currentWord = this.getCurrentWord(linePrefix);
    const isTemplate = /\.template\.(ya?ml|json)$/.test(document.fileName);
    
    if (!ConfigManager.isSupportedFile(document.fileName) && !isTemplate) {
      return [];
    }
    
    try {
      // キャッシュキーを生成
      const cacheKey = this.generateCacheKey(document, position, context, isTemplate);
      const now = Date.now();
      
      // キャッシュチェック
      const cached = this.completionCache.get(cacheKey);
      if (cached && (now - cached.timestamp) < this.CACHE_TTL) {
        console.log('[CompletionProvider] キャッシュされた補完候補を使用');
        return cached.items;
      }

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
      }
      
      const items = this.generateCompletionItemsFromSchema(linePrefix, position, currentWord, this.schemaCache, isTemplate);
      
      // キャッシュを更新
      this.completionCache.set(cacheKey, {
        items: items,
        timestamp: now
      });
      
      return items;
    } catch (error) {
      // YAMLパースエラーの場合は基本的な補完を提供
      return this.getBasicCompletions(linePrefix, position, currentWord);
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
    const linePrefix = text.substring(document.offsetAt(new vscode.Position(position.line, 0)), document.offsetAt(position));
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
        items.push(...this.getComponentPropertyCompletions(context.componentName));
        break;
      
      case 'property-value':
        // プロパティの値
        items.push(...this.getPropertyValueCompletions(context.propertyName, context.componentName));
        break;
      
      case 'root-level':
        // ルートレベル
        items.push(...this.getRootLevelCompletions());
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
  } {
    const lines = linePrefix.split('\n');
    const currentLine = lines[lines.length - 1];
    const indentLevel = this.getIndentLevel(currentLine);

    // ハイフンの後（コンポーネントリスト）
    if (currentLine.trim().endsWith('-') || currentLine.trim() === '-') {
      return { type: 'component-list' };
    }

    // ルートレベル
    if (indentLevel === 0) {
      return { type: 'root-level' };
    }

    // プロパティ値の行（例: variant: ...）を先に判定
    const propertyMatch = currentLine.match(/^\s*(\w+):\s*(.*)$/);
    if (propertyMatch) {
      const propertyName = propertyMatch[1];
      const componentName = this.findParentComponent(lines, lines.length - 1);
      if (componentName) {
        return { type: 'property-value', propertyName, componentName };
      }
    }

    // コンポーネント名の行（- Text: も含む）
    const componentMatch = currentLine.match(/^-?\s*(\w+):\s*$/);
    if (componentMatch) {
      const componentName = this.findParentComponent(lines, lines.length - 1);
      if (componentName) {
        return { type: 'property-value', propertyName: componentMatch[1], componentName };
      } else {
        return { type: 'component-properties', componentName: componentMatch[1] };
      }
    }

    // 空白行やその他の行で、親コンポーネントのプロパティ入力中
    const componentName = this.findParentComponent(lines, lines.length - 1);
    if (componentName) {
      return { type: 'component-properties', componentName };
    }

    return { type: 'root-level' };
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
      const item = new vscode.CompletionItem(componentName, vscode.CompletionItemKind.Class);
      item.detail = COMPONENT_DESCRIPTIONS[componentName] || 'コンポーネント';
      item.insertText = `${componentName}:\n    `;
      item.sortText = `0${componentName}`;
      return item;
    });
  }

  /**
   * コンポーネントのプロパティ補完候補を取得
   */
  private getComponentPropertyCompletions(componentName?: string): vscode.CompletionItem[] {
    if (!componentName) {return [];}

    const properties = this.getComponentProperties(componentName);
    
    return properties.map(prop => {
      const item = new vscode.CompletionItem(prop.name, vscode.CompletionItemKind.Property);
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
      const item = new vscode.CompletionItem(val.value, vscode.CompletionItemKind.Value);
      item.detail = val.description;
      item.insertText = val.value;
      item.sortText = `0${val.value}`;
      return item;
    });
  }

  /**
   * ルートレベルの補完候補を取得
   */
  private getRootLevelCompletions(): vscode.CompletionItem[] {
    const items: vscode.CompletionItem[] = [];
    
    const pageItem = new vscode.CompletionItem('page', vscode.CompletionItemKind.Module);
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
      const completionItem = new vscode.CompletionItem(item.name, vscode.CompletionItemKind.Field);
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
} 