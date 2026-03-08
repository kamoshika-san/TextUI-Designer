export interface TextUIComponentCatalogEntry {
  name: string;
  description: string;
  requiredProps: string[];
  optionalProps: string[];
  supportsChildren: boolean;
  example: Record<string, unknown>;
}

const COMPONENT_CATALOG: readonly TextUIComponentCatalogEntry[] = [
  {
    name: 'Text',
    description: '見出し・本文などのテキスト表示',
    requiredProps: ['value'],
    optionalProps: ['variant', 'size', 'weight', 'color', 'token'],
    supportsChildren: false,
    example: { Text: { value: 'ログイン', variant: 'h2' } }
  },
  {
    name: 'Input',
    description: '単一行/複数行入力フィールド',
    requiredProps: [],
    optionalProps: ['label', 'name', 'type', 'placeholder', 'required', 'disabled', 'multiline', 'token'],
    supportsChildren: false,
    example: { Input: { label: 'メールアドレス', name: 'email', type: 'email', required: true } }
  },
  {
    name: 'Button',
    description: '操作ボタン',
    requiredProps: ['label'],
    optionalProps: ['kind', 'submit', 'disabled', 'size', 'token'],
    supportsChildren: false,
    example: { Button: { label: '送信', kind: 'primary' } }
  },
  {
    name: 'Checkbox',
    description: 'チェックボックス',
    requiredProps: ['label'],
    optionalProps: ['name', 'checked', 'disabled', 'token'],
    supportsChildren: false,
    example: { Checkbox: { label: '利用規約に同意する', name: 'terms' } }
  },
  {
    name: 'Radio',
    description: 'ラジオボタン',
    requiredProps: [],
    optionalProps: ['label', 'name', 'value', 'checked', 'disabled', 'options', 'token'],
    supportsChildren: false,
    example: {
      Radio: {
        label: 'プラン',
        name: 'plan',
        options: [
          { label: 'Basic', value: 'basic' },
          { label: 'Pro', value: 'pro' }
        ]
      }
    }
  },
  {
    name: 'Select',
    description: '選択ボックス',
    requiredProps: [],
    optionalProps: ['label', 'name', 'options', 'placeholder', 'disabled', 'multiple', 'token'],
    supportsChildren: false,
    example: {
      Select: {
        label: '都道府県',
        name: 'prefecture',
        options: [{ label: '東京都', value: 'tokyo' }]
      }
    }
  },
  {
    name: 'DatePicker',
    description: '日付選択フィールド',
    requiredProps: ['label', 'name'],
    optionalProps: ['required', 'disabled', 'min', 'max', 'value', 'token'],
    supportsChildren: false,
    example: {
      DatePicker: {
        label: '生年月日',
        name: 'birthday',
        required: true
      }
    }
  },
  {
    name: 'Divider',
    description: '区切り線',
    requiredProps: [],
    optionalProps: ['orientation', 'spacing', 'token'],
    supportsChildren: false,
    example: { Divider: { orientation: 'horizontal', spacing: 'md' } }
  },
  {
    name: 'Spacer',
    description: '余白用スペーサー',
    requiredProps: [],
    optionalProps: ['axis', 'size', 'width', 'height', 'token'],
    supportsChildren: false,
    example: { Spacer: { axis: 'vertical', size: 'md' } }
  },
  {
    name: 'Alert',
    description: '通知メッセージ',
    requiredProps: ['message'],
    optionalProps: ['variant', 'title', 'token'],
    supportsChildren: false,
    example: { Alert: { variant: 'warning', message: '未入力の項目があります' } }
  },
  {
    name: 'Container',
    description: '子コンポーネントをグループ化',
    requiredProps: [],
    optionalProps: ['layout', 'components', 'width', 'token'],
    supportsChildren: true,
    example: {
      Container: {
        layout: 'vertical',
        components: [{ Text: { value: 'プロフィール' } }, { Input: { label: '名前' } }]
      }
    }
  },
  {
    name: 'Form',
    description: '入力フィールドとアクションをまとめるフォーム',
    requiredProps: ['fields'],
    optionalProps: ['id', 'actions', 'token'],
    supportsChildren: true,
    example: {
      Form: {
        id: 'login-form',
        fields: [{ Input: { label: 'メールアドレス', name: 'email', required: true } }],
        actions: [{ Button: { label: 'ログイン', submit: true } }]
      }
    }
  },
  {
    name: 'Accordion',
    description: '折りたたみ表示',
    requiredProps: ['items'],
    optionalProps: ['allowMultiple', 'token', 'items[].content', 'items[].components'],
    supportsChildren: true,
    example: {
      Accordion: {
        items: [{ title: 'FAQ', components: [{ Text: { value: '質問への回答' } }] }]
      }
    }
  },
  {
    name: 'Tabs',
    description: 'タブ切り替え表示',
    requiredProps: ['items'],
    optionalProps: ['defaultTab', 'token'],
    supportsChildren: true,
    example: {
      Tabs: {
        items: [
          { label: '基本情報', components: [{ Input: { label: '氏名' } }] },
          { label: '設定', components: [{ Checkbox: { label: '通知を受け取る' } }] }
        ]
      }
    }
  },
  {
    name: 'TreeView',
    description: '階層ツリービュー',
    requiredProps: ['items'],
    optionalProps: ['showLines', 'expandAll', 'token'],
    supportsChildren: true,
    example: {
      TreeView: {
        items: [
          { label: 'src', expanded: true, children: [{ label: 'index.ts' }] },
          { label: 'README.md' }
        ]
      }
    }
  },
  {
    name: 'Table',
    description: '表形式表示',
    requiredProps: ['columns', 'rows'],
    optionalProps: ['striped', 'width', 'token'],
    supportsChildren: false,
    example: {
      Table: {
        columns: [{ key: 'name', header: '氏名' }],
        rows: [{ name: '田中 太郎' }]
      }
    }
  }
];

function cloneEntry(entry: TextUIComponentCatalogEntry): TextUIComponentCatalogEntry {
  return {
    ...entry,
    requiredProps: [...entry.requiredProps],
    optionalProps: [...entry.optionalProps],
    example: JSON.parse(JSON.stringify(entry.example)) as Record<string, unknown>
  };
}

export function getTextUiComponentCatalog(): TextUIComponentCatalogEntry[] {
  return COMPONENT_CATALOG.map(cloneEntry);
}
