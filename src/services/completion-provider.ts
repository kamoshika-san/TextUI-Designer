import * as vscode from 'vscode';
import * as YAML from 'yaml';

/**
 * 補完プロバイダー
 * YAML/JSONファイルのIntelliSense機能を提供
 */
export class TextUICompletionProvider implements vscode.CompletionItemProvider {
  private schemaManager: any; // SchemaManagerの型を後で定義

  constructor(schemaManager: any) {
    this.schemaManager = schemaManager;
  }

  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
    context: vscode.CompletionContext
  ): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList<vscode.CompletionItem>> {
    const isTui = document.fileName.endsWith('.tui.yml');
    const isTemplate = /\.template\.(ya?ml|json)$/.test(document.fileName);
    
    if (!isTui && !isTemplate) return [];

    const text = document.getText();
    const linePrefix = text.substring(document.offsetAt(new vscode.Position(position.line, 0)), document.offsetAt(position));
    const wordRange = document.getWordRangeAtPosition(position);
    const currentWord = wordRange ? document.getText(wordRange) : '';
    
    // トリガー文字のチェック
    const triggerChar = context.triggerCharacter;
    const shouldTrigger = !triggerChar || ['-', ':', ' '].includes(triggerChar);
    
    if (!shouldTrigger && context.triggerKind !== vscode.CompletionTriggerKind.Invoke) {
      return [];
    }
    
    try {
      const yaml = YAML.parse(text);
      const schema = this.schemaManager.loadSchema();
      
      return this.generateCompletionItems(linePrefix, position, currentWord, schema, isTemplate);
    } catch (error) {
      // YAMLパースエラーの場合は基本的な補完を提供
      return this.getBasicCompletions(linePrefix, position, currentWord);
    }
  }

  /**
   * スキーマに基づく補完アイテムを生成
   */
  private generateCompletionItems(
    linePrefix: string,
    position: vscode.Position,
    currentWord: string,
    schema: any,
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
    
    // コンポーネント名の行
    const componentMatch = currentLine.match(/^\s*(\w+):\s*$/);
    if (componentMatch) {
      return { type: 'component-properties', componentName: componentMatch[1] };
    }
    
    // プロパティの行
    const propertyMatch = currentLine.match(/^\s*(\w+):\s*$/);
    if (propertyMatch) {
      const componentName = this.findParentComponent(lines, lines.length - 1);
      return { 
        type: 'property-value', 
        propertyName: propertyMatch[1], 
        componentName 
      };
    }
    
    // プロパティ名の入力中
    if (indentLevel > 0 && !currentLine.includes(':')) {
      const componentName = this.findParentComponent(lines, lines.length - 1);
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
    const currentIndent = this.getIndentLevel(lines[currentIndex]);
    
    for (let i = currentIndex - 1; i >= 0; i--) {
      const line = lines[i];
      const indent = this.getIndentLevel(line);
      
      if (indent < currentIndent) {
        const match = line.match(/^\s*(\w+):\s*$/);
        if (match) {
          return match[1];
        }
      }
    }
    
    return undefined;
  }

  /**
   * コンポーネントの補完候補を取得
   */
  private getComponentCompletions(): vscode.CompletionItem[] {
    const components = [
      { name: 'Text', description: 'テキストコンポーネント' },
      { name: 'Input', description: '入力フィールド' },
      { name: 'Button', description: 'ボタン' },
      { name: 'Checkbox', description: 'チェックボックス' },
      { name: 'Radio', description: 'ラジオボタン' },
      { name: 'Select', description: 'セレクトボックス' },
      { name: 'Divider', description: '区切り線' },
      { name: 'Alert', description: 'アラート' },
      { name: 'Container', description: 'コンテナ' },
      { name: 'Form', description: 'フォーム' }
    ];

    return components.map(comp => {
      const item = new vscode.CompletionItem(comp.name, vscode.CompletionItemKind.Class);
      item.detail = comp.description;
      item.insertText = `${comp.name}:\n    `;
      item.sortText = `0${comp.name}`;
      return item;
    });
  }

  /**
   * コンポーネントのプロパティ補完候補を取得
   */
  private getComponentPropertyCompletions(componentName?: string): vscode.CompletionItem[] {
    if (!componentName) return [];

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
   * プロパティの値の補完候補を取得
   */
  private getPropertyValueCompletions(propertyName?: string, componentName?: string): vscode.CompletionItem[] {
    if (!propertyName || !componentName) return [];

    const valueCompletions = this.getPropertyValues(propertyName, componentName);
    
    return valueCompletions.map(value => {
      const item = new vscode.CompletionItem(value.value, vscode.CompletionItemKind.Value);
      item.detail = value.description;
      item.insertText = value.value;
      item.sortText = `0${value.value}`;
      return item;
    });
  }

  /**
   * ルートレベルの補完候補を取得
   */
  private getRootLevelCompletions(): vscode.CompletionItem[] {
    const rootItems = [
      { name: 'page:', description: 'ページ定義' },
      { name: 'components:', description: 'コンポーネント配列' }
    ];

    return rootItems.map(item => {
      const completionItem = new vscode.CompletionItem(item.name, vscode.CompletionItemKind.Snippet);
      completionItem.detail = item.description;
      completionItem.insertText = item.name;
      completionItem.sortText = `0${item.name}`;
      return completionItem;
    });
  }

  /**
   * 基本的な補完アイテムを取得
   */
  private getBasicCompletions(linePrefix: string, position: vscode.Position, currentWord: string): vscode.CompletionItem[] {
    const items: vscode.CompletionItem[] = [];

    // 基本的なYAML構造
    if (linePrefix.trim() === '') {
      const basicStructure = [
        { name: 'page:', description: 'ページ定義' },
        { name: 'components:', description: 'コンポーネント配列' }
      ];

      basicStructure.forEach(item => {
        const completionItem = new vscode.CompletionItem(item.name, vscode.CompletionItemKind.Snippet);
        completionItem.detail = item.description;
        completionItem.insertText = item.name;
        items.push(completionItem);
      });
    }

    return items;
  }

  /**
   * コンポーネントのプロパティを取得
   */
  private getComponentProperties(componentName: string): Array<{ name: string; description: string }> {
    const properties: { [key: string]: Array<{ name: string; description: string }> } = {
      Text: [
        { name: 'variant', description: 'テキストの種類 (h1, h2, h3, p, small, caption)' },
        { name: 'value', description: 'テキストの内容' }
      ],
      Input: [
        { name: 'label', description: 'ラベル' },
        { name: 'name', description: 'フィールド名' },
        { name: 'type', description: '入力タイプ (text, email, password, number, multiline)' },
        { name: 'required', description: '必須項目かどうか' }
      ],
      Button: [
        { name: 'kind', description: 'ボタンの種類 (primary, secondary, submit)' },
        { name: 'label', description: 'ボタンのラベル' },
        { name: 'submit', description: '送信ボタンかどうか' }
      ],
      Checkbox: [
        { name: 'label', description: 'チェックボックスのラベル' },
        { name: 'name', description: 'フィールド名' },
        { name: 'required', description: '必須項目かどうか' }
      ],
      Radio: [
        { name: 'label', description: 'ラジオボタンのラベル' },
        { name: 'name', description: 'フィールド名' },
        { name: 'options', description: '選択肢の配列' }
      ],
      Select: [
        { name: 'label', description: 'セレクトボックスのラベル' },
        { name: 'name', description: 'フィールド名' },
        { name: 'options', description: '選択肢の配列' },
        { name: 'multiple', description: '複数選択を許可するか' }
      ],
      Divider: [
        { name: 'orientation', description: '区切り線の向き (horizontal, vertical)' }
      ],
      Container: [
        { name: 'layout', description: 'レイアウト (vertical, horizontal, flex, grid)' },
        { name: 'components', description: '子コンポーネントの配列' }
      ],
      Alert: [
        { name: 'variant', description: 'アラートの種類 (info, success, warning, error)' },
        { name: 'message', description: '表示するメッセージ内容' }
      ],
      Form: [
        { name: 'id', description: 'フォームのID' },
        { name: 'fields', description: 'フィールドの配列' },
        { name: 'actions', description: 'アクションボタンの配列' }
      ]
    };

    return properties[componentName] || [];
  }

  /**
   * プロパティの値を取得
   */
  private getPropertyValues(propertyName: string, componentName: string): Array<{ value: string; description: string }> {
    const valueMap: { [key: string]: { [key: string]: Array<{ value: string; description: string }> } } = {
      Text: {
        variant: [
          { value: 'h1', description: '見出し1' },
          { value: 'h2', description: '見出し2' },
          { value: 'h3', description: '見出し3' },
          { value: 'p', description: '段落' },
          { value: 'small', description: '小さいテキスト' },
          { value: 'caption', description: 'キャプション' }
        ]
      },
      Input: {
        type: [
          { value: 'text', description: 'テキスト' },
          { value: 'email', description: 'メールアドレス' },
          { value: 'password', description: 'パスワード' },
          { value: 'number', description: '数値' },
          { value: 'multiline', description: '複数行テキスト' }
        ]
      },
      Button: {
        kind: [
          { value: 'primary', description: '主要ボタン' },
          { value: 'secondary', description: '副ボタン' },
          { value: 'submit', description: '送信ボタン' }
        ]
      },
      Divider: {
        orientation: [
          { value: 'horizontal', description: '横線' },
          { value: 'vertical', description: '縦線' }
        ]
      },
      Container: {
        layout: [
          { value: 'vertical', description: '縦配置' },
          { value: 'horizontal', description: '横配置' },
          { value: 'flex', description: 'フレックスレイアウト' },
          { value: 'grid', description: 'グリッドレイアウト' }
        ]
      },
      Alert: {
        variant: [
          { value: 'info', description: '情報' },
          { value: 'success', description: '成功' },
          { value: 'warning', description: '警告' },
          { value: 'error', description: 'エラー' }
        ]
      }
    };

    return valueMap[componentName]?.[propertyName] || [];
  }
} 