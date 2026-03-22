const assert = require('assert');
const { renderPageComponentsToStaticHtml } = require('../../out/exporters/react-static-export');
const { registerBuiltInComponents } = require('../../out/renderer/component-map');

describe('React static export (renderToStaticMarkup)', () => {
  before(() => {
    // 他テスト（extensibility 等）で clearWebViewComponentRegistry されている場合に備え再登録
    registerBuiltInComponents();
  });

  it('Tabs/Badge を含む components で WebView 同構造の HTML を返す', () => {
    const components = [
      { Badge: { label: 'test', variant: 'primary' } },
      {
        Tabs: {
          defaultTab: 0,
          items: [
            { label: 'Tab1', components: [{ Text: { value: 'Body1' } }] },
            { label: 'Tab2', components: [{ Text: { value: 'Body2' } }] }
          ]
        }
      }
    ];
    const html = renderPageComponentsToStaticHtml(components);

    assert.ok(html.includes('textui-badge') || html.includes('test'), 'output should include textui-badge class or Badge label "test"');
    assert.ok(html.includes('textui-tabs'), 'output should include textui-tabs class');
    assert.ok(
      html.includes('role="tablist"'),
      'output should include WebView structure role="tablist"'
    );
    // 静的レンダーでは defaultTab のパネルのみ描画される
    assert.ok(html.includes('Body1'), 'default tab body content should be present');
  });


  it('Container の token を背景色スタイルとして静的HTMLに出力する', () => {
    const html = renderPageComponentsToStaticHtml([
      { Container: { layout: 'vertical', token: 'rgb(240, 240, 240)', components: [{ Text: { value: 'inside' } }] } }
    ]);

    assert.ok(
      html.includes('var(--tui-slot-container-background, rgb(240, 240, 240))') ||
        html.includes('background-color:rgb(240, 240, 240)') ||
        html.includes('background-color: rgb(240, 240, 240)')
    );
    assert.ok(html.includes('inside'));
  });

  it('空の components で padding 付き div のみの HTML を返す', () => {
    const html = renderPageComponentsToStaticHtml([]);
    assert.ok(html.includes('padding:24px') || html.includes('padding: 24px'), 'root should have padding 24');
    assert.ok(html.includes('<div'), 'should contain div');
  });
});
