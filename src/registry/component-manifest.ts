/**
 * コンポーネント定義の単一ソース
 * - コンポーネント名
 * - 補完用説明
 * - 補完用プロパティ
 * - スキーマ参照
 */

export const BUILT_IN_COMPONENTS = [
  'Text',
  'Input',
  'Button',
  'Checkbox',
  'Radio',
  'Select',
  'Divider',
  'Alert',
  'Container',
  'Form'
] as const;

export type BuiltInComponentName = typeof BUILT_IN_COMPONENTS[number];

export type CompletionValue = { value: string; description: string };
export type ComponentProperty = {
  name: string;
  description: string;
  values?: CompletionValue[];
};

export interface ComponentManifestEntry {
  description: string;
  properties: ComponentProperty[];
  schemaRef: `#/definitions/${string}`;
}

const BOOLEAN_VALUES: CompletionValue[] = [
  { value: 'true', description: '有効' },
  { value: 'false', description: '無効' }
];

export const COMPONENT_MANIFEST: Record<BuiltInComponentName, ComponentManifestEntry> = {
  Text: {
    description: 'テキストコンポーネント',
    schemaRef: '#/definitions/Text',
    properties: [
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
    ]
  },
  Input: {
    description: '入力フィールド',
    schemaRef: '#/definitions/Input',
    properties: [
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
    ]
  },
  Button: {
    description: 'ボタン',
    schemaRef: '#/definitions/Button',
    properties: [
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
    ]
  },
  Checkbox: {
    description: 'チェックボックス',
    schemaRef: '#/definitions/Checkbox',
    properties: [
      { name: 'label', description: '表示ラベル' },
      { name: 'name', description: '入力名' },
      { name: 'checked', description: 'チェック状態', values: BOOLEAN_VALUES },
      { name: 'disabled', description: '無効化', values: BOOLEAN_VALUES }
    ]
  },
  Radio: {
    description: 'ラジオボタン',
    schemaRef: '#/definitions/Radio',
    properties: [
      { name: 'label', description: '表示ラベル' },
      { name: 'name', description: 'グループ名' },
      { name: 'value', description: '値' },
      { name: 'checked', description: '選択状態', values: BOOLEAN_VALUES },
      { name: 'disabled', description: '無効化', values: BOOLEAN_VALUES },
      { name: 'options', description: '選択肢配列' }
    ]
  },
  Select: {
    description: 'セレクトボックス',
    schemaRef: '#/definitions/Select',
    properties: [
      { name: 'label', description: '表示ラベル' },
      { name: 'name', description: '入力名' },
      { name: 'options', description: '選択肢配列' },
      { name: 'placeholder', description: 'プレースホルダー' },
      { name: 'disabled', description: '無効化', values: BOOLEAN_VALUES },
      { name: 'multiple', description: '複数選択', values: BOOLEAN_VALUES }
    ]
  },
  Divider: {
    description: '区切り線',
    schemaRef: '#/definitions/Divider',
    properties: [
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
    ]
  },
  Alert: {
    description: 'アラート',
    schemaRef: '#/definitions/Alert',
    properties: [
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
    ]
  },
  Container: {
    description: 'コンテナ',
    schemaRef: '#/definitions/Container',
    properties: [
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
    ]
  },
  Form: {
    description: 'フォーム',
    schemaRef: '#/definitions/Form',
    properties: [
      { name: 'id', description: 'フォームID' },
      { name: 'fields', description: '入力フィールド配列' },
      { name: 'actions', description: 'アクション配列' }
    ]
  }
};

export function isBuiltInComponentName(name: string): name is BuiltInComponentName {
  return (BUILT_IN_COMPONENTS as readonly string[]).includes(name);
}

export function getComponentSchemaRefs(): string[] {
  return BUILT_IN_COMPONENTS.map(componentName => COMPONENT_MANIFEST[componentName].schemaRef);
}
