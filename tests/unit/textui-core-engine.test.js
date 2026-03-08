const assert = require('assert');

describe('TextUICoreEngine', () => {
  let TextUICoreEngine;

  before(() => {
    ({ TextUICoreEngine } = require('../../out/core/textui-core-engine'));
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

  it('listComponents はButton定義を含む', async () => {
    const engine = new TextUICoreEngine();
    const result = await engine.listComponents();
    const button = result.components.find(component => component.name === 'Button');
    assert.ok(button);
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
});
