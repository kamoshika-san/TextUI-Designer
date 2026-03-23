const assert = require('assert');
const { renderPageComponentsToStaticHtml } = require('../../out/exporters/react-static-export');
const { registerBuiltInComponents } = require('../../out/renderer/component-map');
const { clearWebViewComponentRegistry } = require('../../out/registry/webview-component-registry');

describe('React static export (renderToStaticMarkup)', () => {
  before(() => {
    registerBuiltInComponents();
  });

  it('renders Tabs and Badge with the same structure as the WebView path', () => {
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

    assert.ok(html.includes('textui-badge') || html.includes('test'));
    assert.ok(html.includes('textui-tabs'));
    assert.ok(html.includes('role="tablist"'));
    assert.ok(html.includes('Body1'));
  });

  it('re-registers built-in renderers when the shared registry was cleared', () => {
    clearWebViewComponentRegistry();

    const html = renderPageComponentsToStaticHtml([
      { Text: { value: 'TextUI Designer - All Components', variant: 'h1' } },
      { Link: { href: 'https://example.com', label: 'kamoshika-san / TextUI-Designer' } }
    ]);

    assert.ok(html.includes('TextUI Designer - All Components'));
    assert.ok(html.includes('kamoshika-san / TextUI-Designer'));
    assert.ok(!html.includes('Unsupported'));
  });

  it('renders container token styles into static HTML', () => {
    const html = renderPageComponentsToStaticHtml([
      { Container: { layout: 'vertical', token: 'rgb(240, 240, 240)', components: [{ Text: { value: 'inside' } }] } }
    ]);

    assert.ok(
      html.includes('var(--tui-slot-container-background, rgb(240, 240, 240))') ||
      html.includes('background-color:rgb(240, 240, 240)') ||
      html.includes('background-color: rgb(240, 240, 240)')
    );
    assert.ok(
      html.includes('var(--tui-slot-container-border, rgb(240, 240, 240))') ||
      html.includes('border-color:rgb(240, 240, 240)') ||
      html.includes('border-color: rgb(240, 240, 240)')
    );
    assert.ok(html.includes('inside'));
  });

  it('renders an empty component list as a padded root div', () => {
    const html = renderPageComponentsToStaticHtml([]);
    assert.ok(html.includes('padding:24px') || html.includes('padding: 24px'));
    assert.ok(html.includes('<div'));
  });
});
