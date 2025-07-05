export interface ComponentProperty {
  name: string;
  description: string;
  type: 'string' | 'boolean' | 'array' | 'object';
  required?: boolean;
}

export interface PropertyValue {
  value: string;
  description: string;
}

export interface ComponentDefinition {
  name: string;
  description: string;
  properties: ComponentProperty[];
  insertText: string;
}

/**
 * コンポーネント定義マネージャー
 * コンポーネントのプロパティと値の定義を管理
 */
export class ComponentDefinitions {
  private static readonly COMPONENTS: Record<string, ComponentDefinition> = {
    Text: {
      name: 'Text',
      description: 'テキストコンポーネント',
      insertText: 'Text:\n    ',
      properties: [
        { name: 'variant', description: 'テキストの種類（h1, h2, h3, p, span）', type: 'string' },
        { name: 'value', description: 'テキストの内容', type: 'string', required: true },
        { name: 'className', description: 'CSSクラス名', type: 'string' }
      ]
    },
    Input: {
      name: 'Input',
      description: '入力フィールド',
      insertText: 'Input:\n    ',
      properties: [
        { name: 'type', description: '入力タイプ（text, email, password, number）', type: 'string' },
        { name: 'placeholder', description: 'プレースホルダーテキスト', type: 'string' },
        { name: 'value', description: '初期値', type: 'string' },
        { name: 'required', description: '必須入力', type: 'boolean' },
        { name: 'className', description: 'CSSクラス名', type: 'string' }
      ]
    },
    Button: {
      name: 'Button',
      description: 'ボタン',
      insertText: 'Button:\n    ',
      properties: [
        { name: 'variant', description: 'ボタンの種類（primary, secondary, outline）', type: 'string' },
        { name: 'text', description: 'ボタンのテキスト', type: 'string', required: true },
        { name: 'onClick', description: 'クリック時の処理', type: 'string' },
        { name: 'disabled', description: '無効化', type: 'boolean' },
        { name: 'className', description: 'CSSクラス名', type: 'string' }
      ]
    },
    Checkbox: {
      name: 'Checkbox',
      description: 'チェックボックス',
      insertText: 'Checkbox:\n    ',
      properties: [
        { name: 'label', description: 'チェックボックスのラベル', type: 'string', required: true },
        { name: 'checked', description: 'チェック状態', type: 'boolean' },
        { name: 'onChange', description: '変更時の処理', type: 'string' },
        { name: 'className', description: 'CSSクラス名', type: 'string' }
      ]
    },
    Radio: {
      name: 'Radio',
      description: 'ラジオボタン',
      insertText: 'Radio:\n    ',
      properties: [
        { name: 'name', description: 'ラジオボタングループ名', type: 'string', required: true },
        { name: 'options', description: '選択肢の配列', type: 'array', required: true },
        { name: 'value', description: '選択された値', type: 'string' },
        { name: 'onChange', description: '変更時の処理', type: 'string' },
        { name: 'className', description: 'CSSクラス名', type: 'string' }
      ]
    },
    Select: {
      name: 'Select',
      description: 'セレクトボックス',
      insertText: 'Select:\n    ',
      properties: [
        { name: 'options', description: '選択肢の配列', type: 'array', required: true },
        { name: 'value', description: '選択された値', type: 'string' },
        { name: 'placeholder', description: 'プレースホルダーテキスト', type: 'string' },
        { name: 'onChange', description: '変更時の処理', type: 'string' },
        { name: 'className', description: 'CSSクラス名', type: 'string' }
      ]
    },
    Divider: {
      name: 'Divider',
      description: '区切り線',
      insertText: 'Divider:\n    ',
      properties: [
        { name: 'orientation', description: '区切り線の方向（horizontal, vertical）', type: 'string' },
        { name: 'className', description: 'CSSクラス名', type: 'string' }
      ]
    },
    Alert: {
      name: 'Alert',
      description: 'アラート',
      insertText: 'Alert:\n    ',
      properties: [
        { name: 'variant', description: 'アラートの種類（info, success, warning, error）', type: 'string' },
        { name: 'title', description: 'アラートのタイトル', type: 'string' },
        { name: 'message', description: 'アラートのメッセージ', type: 'string', required: true },
        { name: 'className', description: 'CSSクラス名', type: 'string' }
      ]
    },
    Container: {
      name: 'Container',
      description: 'コンテナ',
      insertText: 'Container:\n    ',
      properties: [
        { name: 'layout', description: 'レイアウト（vertical, horizontal）', type: 'string' },
        { name: 'spacing', description: '要素間の間隔', type: 'string' },
        { name: 'className', description: 'CSSクラス名', type: 'string' }
      ]
    },
    Form: {
      name: 'Form',
      description: 'フォーム',
      insertText: 'Form:\n    ',
      properties: [
        { name: 'onSubmit', description: '送信時の処理', type: 'string' },
        { name: 'className', description: 'CSSクラス名', type: 'string' }
      ]
    }
  };

  private static readonly PROPERTY_VALUES: Record<string, PropertyValue[]> = {
    variant: [
      { value: 'h1', description: '見出し1' },
      { value: 'h2', description: '見出し2' },
      { value: 'h3', description: '見出し3' },
      { value: 'p', description: '段落' },
      { value: 'span', description: 'インライン' },
      { value: 'primary', description: 'プライマリ' },
      { value: 'secondary', description: 'セカンダリ' },
      { value: 'outline', description: 'アウトライン' },
      { value: 'info', description: '情報' },
      { value: 'success', description: '成功' },
      { value: 'warning', description: '警告' },
      { value: 'error', description: 'エラー' }
    ],
    type: [
      { value: 'text', description: 'テキスト' },
      { value: 'email', description: 'メールアドレス' },
      { value: 'password', description: 'パスワード' },
      { value: 'number', description: '数値' }
    ],
    layout: [
      { value: 'vertical', description: '縦並び' },
      { value: 'horizontal', description: '横並び' }
    ],
    orientation: [
      { value: 'horizontal', description: '水平' },
      { value: 'vertical', description: '垂直' }
    ]
  };

  /**
   * コンポーネント定義を取得
   */
  static getComponent(name: string): ComponentDefinition | undefined {
    return this.COMPONENTS[name];
  }

  /**
   * 全コンポーネント定義を取得
   */
  static getAllComponents(): ComponentDefinition[] {
    return Object.values(this.COMPONENTS);
  }

  /**
   * コンポーネントのプロパティを取得
   */
  static getComponentProperties(componentName: string): ComponentProperty[] {
    const component = this.getComponent(componentName);
    return component?.properties || [];
  }

  /**
   * プロパティの値を取得
   */
  static getPropertyValues(propertyName: string): PropertyValue[] {
    return this.PROPERTY_VALUES[propertyName] || [];
  }

  /**
   * テンプレートコンポーネントを取得
   */
  static getTemplateComponents(): ComponentDefinition[] {
    return [
      {
        name: '$include',
        description: 'テンプレート参照',
        insertText: '$include:\n  template: "${1:./templates/example.template.yml}"\n  params:\n    ${2:paramName}: ${3:paramValue}',
        properties: [
          { name: 'template', description: 'テンプレートファイルパス', type: 'string', required: true },
          { name: 'params', description: 'パラメータ', type: 'object' }
        ]
      },
      {
        name: '$if',
        description: '条件分岐',
        insertText: '$if:\n  condition: "${1:$params.showHeader}"\n  template:\n    - ${2:Text}:\n        value: "${3:条件付きテキスト}"',
        properties: [
          { name: 'condition', description: '条件式', type: 'string', required: true },
          { name: 'template', description: '条件が真の時のテンプレート', type: 'array', required: true }
        ]
      },
      {
        name: '$foreach',
        description: '配列ループ',
        insertText: '$foreach:\n  items: "${1:$params.items}"\n  as: "${2:item}"\n  template:\n    - ${3:Text}:\n        value: "{{ ${2:item}.name }}"',
        properties: [
          { name: 'items', description: '配列', type: 'array', required: true },
          { name: 'as', description: '要素の変数名', type: 'string', required: true },
          { name: 'template', description: '繰り返すテンプレート', type: 'array', required: true }
        ]
      }
    ];
  }
} 