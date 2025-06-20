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
    
    try {
      const yaml = YAML.parse(text);
      const schema = this.schemaManager.loadSchema();
      
      return this.generateCompletionItems(linePrefix, position, schema, isTemplate);
    } catch (error) {
      // YAMLパースエラーの場合は基本的な補完を提供
      return this.getBasicCompletions(linePrefix, position);
    }
  }

  /**
   * スキーマに基づく補完アイテムを生成
   */
  private generateCompletionItems(
    linePrefix: string,
    position: vscode.Position,
    schema: any,
    isTemplate: boolean
  ): vscode.CompletionItem[] {
    const items: vscode.CompletionItem[] = [];

    // コンポーネント名の補完
    if (linePrefix.trim().endsWith('-') || linePrefix.trim() === '') {
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

      components.forEach(comp => {
        const item = new vscode.CompletionItem(comp.name, vscode.CompletionItemKind.Class);
        item.detail = comp.description;
        item.insertText = `${comp.name}:\n    `;
        items.push(item);
      });
    }

    // プロパティの補完
    if (linePrefix.includes(':')) {
      const currentComponent = this.getCurrentComponent(linePrefix);
      if (currentComponent) {
        const properties = this.getComponentProperties(currentComponent);
        properties.forEach(prop => {
          const item = new vscode.CompletionItem(prop.name, vscode.CompletionItemKind.Property);
          item.detail = prop.description;
          item.insertText = `${prop.name}: `;
          items.push(item);
        });
      }
    }

    return items;
  }

  /**
   * 基本的な補完アイテムを取得
   */
  private getBasicCompletions(linePrefix: string, position: vscode.Position): vscode.CompletionItem[] {
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
   * 現在のコンポーネント名を取得
   */
  private getCurrentComponent(linePrefix: string): string | null {
    const lines = linePrefix.split('\n');
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim();
      if (line.endsWith(':')) {
        const componentName = line.slice(0, -1).trim();
        if (componentName && !componentName.includes(' ')) {
          return componentName;
        }
      }
    }
    return null;
  }

  /**
   * コンポーネントのプロパティを取得
   */
  private getComponentProperties(componentName: string): Array<{ name: string; description: string }> {
    const properties: { [key: string]: Array<{ name: string; description: string }> } = {
      Text: [
        { name: 'variant', description: 'テキストの種類 (h1, h2, h3, p, small, caption)' },
        { name: 'value', description: 'テキストの内容' },
        { name: 'size', description: 'フォントサイズ' },
        { name: 'weight', description: 'フォントの太さ' }
      ],
      Input: [
        { name: 'label', description: 'ラベル' },
        { name: 'name', description: 'フィールド名' },
        { name: 'type', description: '入力タイプ (text, email, password, number)' },
        { name: 'required', description: '必須項目かどうか' },
        { name: 'placeholder', description: 'プレースホルダー' }
      ],
      Button: [
        { name: 'kind', description: 'ボタンの種類 (primary, secondary, submit)' },
        { name: 'label', description: 'ボタンのラベル' },
        { name: 'submit', description: '送信ボタンかどうか' }
      ],
      Container: [
        { name: 'layout', description: 'レイアウト (vertical, horizontal, flex, grid)' },
        { name: 'components', description: '子コンポーネントの配列' }
      ],
      Form: [
        { name: 'id', description: 'フォームのID' },
        { name: 'fields', description: 'フィールドの配列' },
        { name: 'actions', description: 'アクションボタンの配列' }
      ]
    };

    return properties[componentName] || [];
  }
} 