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

  it('compareUi returns a normalized compare skeleton', () => {
    const engine = new TextUICoreEngine();
    const result = engine.compareUi({
      previousDsl: {
        page: { id: 'before-page', title: 'Before', layout: 'vertical', components: [{ Text: { value: 'Before hello', variant: 'p' } }] }
      },
      nextDsl: {
        page: { id: 'after-page', title: 'After', layout: 'vertical', components: [{ Text: { value: 'Hello', variant: 'p' } }] }
      }
    });

    assert.strictEqual(result.ok, true);
    assert.deepStrictEqual(result.diagnostics, []);
    assert.ok(result.previous);
    assert.ok(result.next);
    assert.ok(result.result);
    assert.strictEqual(result.previous.page.componentCount, 1);
    assert.strictEqual(result.next.page.componentCount, 1);
    assert.strictEqual(result.result.kind, 'textui-diff-result');
    assert.strictEqual(result.result.metadata.compareStage, 'c1-skeleton');
    assert.deepStrictEqual(result.result.metadata.supportedEventKinds, ['add', 'remove', 'update', 'reorder', 'move', 'rename', 'remove+add']);
    assert.strictEqual(result.result.entityResults.length, 1);
    assert.ok(result.result.events.length >= 4);
    assert.strictEqual(result.result.events[0].kind, 'update');
    assert.strictEqual(result.result.events[0].trace.explicitness, 'preserved');
    assert.strictEqual(result.result.events[0].trace.pairingReason, 'deterministic-structural-path');
    assert.strictEqual(result.result.entityResults[0].entityKind, 'page');
    assert.strictEqual(result.result.entityResults[0].status, 'pending');
    assert.strictEqual(result.result.entityResults[0].children.length >= 3, true);
    assert.strictEqual(result.result.entityResults[0].children[0].entityKind, 'property');
    assert.strictEqual(result.result.entityResults[0].children[2].entityKind, 'component');
    assert.strictEqual(result.result.entityResults[0].children[2].children[0].entityKind, 'property');
    assert.strictEqual(result.result.entityResults[0].children[2].metadata.eventIds.length >= 1, true);
    assert.ok(result.result.events.some(event => event.entityKind === 'component' && event.kind === 'update'));
    assert.strictEqual(result.result.entityResults[0].metadata.eventIds.length, result.result.events.length);
  });

  it('compareUi keeps deterministic continuity when component ids match', () => {
    const engine = new TextUICoreEngine();
    const result = engine.compareUi({
      previousDsl: {
        page: { id: 'same-page', title: 'Before', layout: 'vertical', components: [{ Form: { id: 'profile-form', fields: [] } }] }
      },
      nextDsl: {
        page: { id: 'same-page', title: 'After', layout: 'vertical', components: [{ Form: { id: 'profile-form', fields: [] } }] }
      }
    });

    assert.strictEqual(result.ok, true);
    assert.ok(result.result);
    assert.strictEqual(result.result.events[0].trace.pairingReason, 'deterministic-explicit-id');
    assert.strictEqual(result.result.events[0].trace.identitySource, 'explicit-id');
    assert.strictEqual(result.result.entityResults[0].children[2].previous.path, '/page/components/0');
    assert.strictEqual(result.result.entityResults[0].children[2].next.path, '/page/components/0');
    assert.strictEqual(result.result.entityResults[0].children[2].metadata.eventIds.length >= 1, true);
    assert.ok(result.result.entityResults[0].children[2].metadata.eventIds[0].includes('component:Form:profile-form:'));
  });

  it('compareUi classifies sibling swaps as reorder when fallback identity is stable', () => {
    const engine = new TextUICoreEngine();
    const result = engine.compareUi({
      previousDsl: {
        page: {
          id: 'same-page',
          title: 'Before',
          layout: 'vertical',
          components: [
            { Input: { name: 'email', label: 'Email', type: 'text' } },
            { Input: { name: 'password', label: 'Password', type: 'text' } }
          ]
        }
      },
      nextDsl: {
        page: {
          id: 'same-page',
          title: 'After',
          layout: 'vertical',
          components: [
            { Input: { name: 'password', label: 'Password', type: 'text' } },
            { Input: { name: 'email', label: 'Email', type: 'text' } }
          ]
        }
      }
    });

    assert.strictEqual(result.ok, true);
    assert.ok(result.result);
    assert.ok(result.result.events.some(event => event.entityKind === 'component' && event.kind === 'reorder'));
  });

  it('compareUi falls back to remove+add when kind continuity breaks', () => {
    const engine = new TextUICoreEngine();
    const result = engine.compareUi({
      previousDsl: {
        page: { id: 'same-page', title: 'Before', layout: 'vertical', components: [{ Text: { value: 'Before', variant: 'p' } }] }
      },
      nextDsl: {
        page: { id: 'same-page', title: 'After', layout: 'vertical', components: [{ Link: { href: '/next', label: 'Before' } }] }
      }
    });

    assert.strictEqual(result.ok, true);
    assert.ok(result.result);
    assert.ok(result.result.events.some(event => event.entityKind === 'component' && event.kind === 'remove+add'));
  });

  it('compareUi uses bounded heuristic similarity for missing-id sibling swaps', () => {
    const engine = new TextUICoreEngine();
    const result = engine.compareUi({
      previousDsl: {
        page: {
          id: 'same-page',
          title: 'Before',
          layout: 'vertical',
          components: [
            { Text: { value: 'Alpha', variant: 'p' } },
            { Text: { value: 'Beta', variant: 'p' } }
          ]
        }
      },
      nextDsl: {
        page: {
          id: 'same-page',
          title: 'After',
          layout: 'vertical',
          components: [
            { Text: { value: 'Beta', variant: 'p' } },
            { Text: { value: 'Alpha', variant: 'p' } }
          ]
        }
      }
    });

    assert.strictEqual(result.ok, true);
    assert.ok(result.result);
    const heuristicReorder = result.result.events.find(
      event => event.entityKind === 'component'
        && event.kind === 'reorder'
        && event.trace.pairingReason === 'heuristic-similarity'
    );
    assert.ok(heuristicReorder);
    assert.strictEqual(heuristicReorder.trace.fallbackMarker, 'heuristic-pending');
    assert.strictEqual(heuristicReorder.trace.fallbackConfidence, 'high');
  });

  it('compareUi marks property additions with explicitness carry', () => {
    const engine = new TextUICoreEngine();
    const result = engine.compareUi({
      previousDsl: {
        page: { id: 'same-page', title: 'Before', layout: 'vertical', components: [{ Input: { name: 'email', label: 'Email', type: 'text' } }] }
      },
      nextDsl: {
        page: { id: 'same-page', title: 'After', layout: 'vertical', components: [{ Input: { name: 'email', label: 'Email', type: 'text', placeholder: 'enter email' } }] }
      }
    });

    assert.strictEqual(result.ok, true);
    assert.ok(result.result);
    const placeholderEvent = result.result.events.find(event => event.entityKey === 'property:/page/components/0/props/placeholder');
    assert.ok(placeholderEvent);
    assert.strictEqual(placeholderEvent.kind, 'add');
    assert.strictEqual(placeholderEvent.trace.explicitness, 'absent-on-previous');
    assert.strictEqual(placeholderEvent.trace.nextSourceRef.entityPath, '/page/components/0/props/placeholder');
    assert.strictEqual(placeholderEvent.trace.previousSourceRef, undefined);
  });

  it('compareUi prefixes diagnostics with the invalid side', () => {
    const engine = new TextUICoreEngine();
    const result = engine.compareUi({
      previousDsl: 'page: [',
      nextDsl: {
        page: { id: 'after-page', title: 'After', layout: 'vertical', components: [] }
      }
    });

    assert.strictEqual(result.ok, false);
    assert.ok(result.diagnostics.length >= 1);
    assert.ok(result.diagnostics[0].message.includes('[previous]'));
    assert.strictEqual(result.result, undefined);
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
      'Breadcrumb',
      'Modal',
      'Link',
      'Badge',
      'Progress',
      'Image',
      'Icon',
      'Divider',
      'Spacer'
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
