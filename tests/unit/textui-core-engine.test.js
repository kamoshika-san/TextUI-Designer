const assert = require('assert');

describe('TextUICoreEngine', () => {
  let TextUICoreEngine;
  let getComponentSpecTypesForTesting;
  let getComponentSpecHandlerFlagsForTesting;

  before(() => {
    ({ TextUICoreEngine, getComponentSpecTypesForTesting, getComponentSpecHandlerFlagsForTesting } = require('../../out/core/textui-core-engine'));
  });

  it('generateUi でDSLとHTMLを生成できる', async () => {
    const engine = new TextUICoreEngine();
    const result = await engine.generateUi({
      title: 'ログイン画面',
      components: [
        { type: 'Input', props: { label: 'メールアドレス', name: 'email', type: 'email' } },
        { type: 'Button', props: { label: 'ログイン', submit: true } }
      ],
      format: 'html'
    });

    assert.strictEqual(result.validation.valid, true);
    assert.ok(result.yaml.includes('page:'));
    assert.ok(result.exportedCode.includes('<!DOCTYPE html>') || result.exportedCode.includes('<html'));
  });

  it('validateUi で不正DSLを検出しヒントを返す', () => {
    const engine = new TextUICoreEngine();
    const invalidDsl = `
page:
  id: test
  title: test
  layout: vertical
  components:
    - Button: {}
`;

    const result = engine.validateUi({
      dsl: invalidDsl,
      skipTokenValidation: true
    });

    assert.strictEqual(result.valid, false);
    assert.ok(result.diagnostics.length >= 1);
    assert.ok(typeof result.diagnostics[0].hint === 'string');
    assert.ok(result.diagnostics[0].hint.length > 0);
  });

  it('previewSchema はjsonPointer指定で部分取得できる', () => {
    const engine = new TextUICoreEngine();
    const result = engine.previewSchema({
      schema: 'main',
      jsonPointer: '/properties/page'
    });

    assert.strictEqual(result.schema, 'main');
    assert.ok(result.value);
    assert.strictEqual(typeof result.value, 'object');
  });

  it('listComponents はButton/Image定義を含む', async () => {
    const engine = new TextUICoreEngine();
    const result = await engine.listComponents();
    const button = result.components.find(component => component.name === 'Button');
    const image = result.components.find(component => component.name === 'Image');
    assert.ok(button);
    assert.ok(image);
    assert.deepStrictEqual(image.requiredProps, ['src']);
    assert.ok(result.supportedProviders.includes('html'));
  });

  it('Accordion item に components を入れてDSL生成できる', async () => {
    const engine = new TextUICoreEngine();
    const result = await engine.generateUi({
      title: 'アコーディオンテスト',
      components: [
        {
          type: 'Accordion',
          items: [
            {
              title: 'セクション1',
              components: [
                { type: 'Text', props: { variant: 'p', value: 'ネストされた本文' } },
                { type: 'Input', props: { label: '名前', name: 'name', type: 'text' } }
              ]
            }
          ]
        }
      ]
    });

    assert.strictEqual(result.validation.valid, true);
    assert.ok(result.yaml.includes('Accordion:'));
    assert.ok(result.yaml.includes('components:'));
    assert.ok(result.yaml.includes('ネストされた本文'));
  });

  it('Tabs item に components を入れてDSL生成できる', async () => {
    const engine = new TextUICoreEngine();
    const result = await engine.generateUi({
      title: 'タブテスト',
      components: [
        {
          type: 'Tabs',
          items: [
            {
              label: '基本情報',
              components: [
                { type: 'Text', props: { variant: 'p', value: 'プロフィール' } },
                { type: 'Input', props: { label: 'ユーザー名' } }
              ]
            }
          ]
        }
      ]
    });

    assert.strictEqual(result.validation.valid, true);
    assert.ok(result.yaml.includes('Tabs:'));
    assert.ok(result.yaml.includes('components:'));
    assert.ok(result.yaml.includes('ユーザー名'));
  });

  it('Input の必須デフォルトが補完される', async () => {
    const engine = new TextUICoreEngine();
    const result = await engine.generateUi({
      title: '入力デフォルトテスト',
      components: [
        { type: 'Input', props: {} }
      ]
    });

    assert.strictEqual(result.validation.valid, true);
    assert.ok(result.yaml.includes('label: 入力'));
    assert.ok(result.yaml.includes('name: field'));
    assert.ok(result.yaml.includes('type: text'));
  });

  it('Form の fields/actions を生成し、fields未指定時は空配列で補完される', async () => {
    const engine = new TextUICoreEngine();
    const withChildren = await engine.generateUi({
      title: 'フォームテスト',
      components: [
        {
          type: 'Form',
          fields: [
            { type: 'Input', props: { label: 'メール' } }
          ],
          actions: [
            { type: 'Button', props: { label: '保存' } }
          ]
        }
      ]
    });

    assert.strictEqual(withChildren.validation.valid, true);
    assert.ok(withChildren.yaml.includes('fields:'));
    assert.ok(withChildren.yaml.includes('actions:'));

    const withoutFields = await engine.generateUi({
      title: 'フォームfields未指定テスト',
      components: [
        { type: 'Form', props: { id: 'empty-form' } }
      ]
    });

    assert.strictEqual(withoutFields.validation.valid, true);
    assert.ok(withoutFields.yaml.includes('fields: []'));
  });

  it('TreeView の children/components を再帰展開できる', async () => {
    const engine = new TextUICoreEngine();
    const result = await engine.generateUi({
      title: 'ツリービューテスト',
      components: [
        {
          type: 'TreeView',
          items: [
            {
              label: '親',
              components: [
                { type: 'Text', props: { variant: 'p', value: '親ノード説明' } }
              ],
              children: [
                {
                  label: '子',
                  components: [
                    { type: 'Text', props: { variant: 'small', value: '子ノード説明' } }
                  ]
                }
              ]
            }
          ]
        }
      ]
    });

    assert.strictEqual(result.validation.valid, true);
    assert.ok(result.yaml.includes('TreeView:'));
    assert.ok(result.yaml.includes('children:'));
    assert.ok(result.yaml.includes('子ノード説明'));
  });


  it('ComponentSpec の定義が想定コンポーネントを網羅し、最低1つのハンドラを持つ', () => {
    const expectedTypes = [
      'Container',
      'Form',
      'Tabs',
      'Accordion',
      'TreeView',
      'Text',
      'Input',
      'Button',
      'Checkbox',
      'Radio',
      'Select',
      'DatePicker',
      'Alert',
      'Table',
      'Breadcrumb'
    ];

    const specTypes = getComponentSpecTypesForTesting();
    assert.deepStrictEqual([...specTypes].sort(), [...expectedTypes].sort());

    const flagsByType = getComponentSpecHandlerFlagsForTesting();
    for (const type of expectedTypes) {
      const flags = flagsByType[type];
      assert.ok(flags, `missing spec for ${type}`);
      assert.ok(flags.applyDefaults || flags.resolveChildren, `spec ${type} has no handlers`);
    }

    const childResolutionTypes = ['Container', 'Form', 'Tabs', 'Accordion', 'TreeView'];
    for (const type of childResolutionTypes) {
      const flags = flagsByType[type];
      assert.ok(flags.resolveChildren, `${type} should resolve children`);
    }
  });

});
