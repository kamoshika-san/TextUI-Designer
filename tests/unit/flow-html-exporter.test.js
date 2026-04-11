const assert = require('assert');
const { FlowHtmlExporter } = require('../../out/exporters/flow-html-exporter');

describe('FlowHtmlExporter', () => {
  it('renders static page sections and sitemap output for navigation flow input', async () => {
    const exporter = new FlowHtmlExporter();
    const code = await exporter.export({
      flow: {
        id: 'checkout',
        version: '2',
        title: 'Checkout',
        entry: 'cart',
        screens: [
          { id: 'cart', page: './screens/cart.tui.yml', title: 'Cart' },
          { id: 'shipping', page: './screens/shipping.tui.yml', title: 'Shipping', kind: 'terminal', terminal: { kind: 'success', outcome: 'done' } }
        ],
        transitions: [
          { id: 't-cart-shipping', from: 'cart', to: 'shipping', trigger: 'next', kind: 'forward' }
        ]
      }
    }, { format: 'html-flow' });

    assert.ok(code.includes('<!-- page: /index.html -->'));
    assert.ok(code.includes('<!-- file: sitemap.xml -->'));
    assert.ok(code.includes('<loc>/screens/shipping</loc>'));
    assert.ok(code.includes('Outgoing Transitions: t-cart-shipping'));
    assert.ok(code.includes('Terminal Kind: success'));
  });

  it('throws when export is called with a non-navigation DSL shape', async () => {
    const exporter = new FlowHtmlExporter();

    await assert.rejects(
      exporter.export({ page: { id: 'not-a-flow' } }, { format: 'html-flow' }),
      /FlowHtmlExporter requires a navigation flow DSL/
    );
  });

  it('returns the expected file extension', () => {
    const exporter = new FlowHtmlExporter();
    assert.strictEqual(exporter.getFileExtension(), '.html');
  });
});
