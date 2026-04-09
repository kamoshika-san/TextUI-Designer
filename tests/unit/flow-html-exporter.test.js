const assert = require('assert');
const { FlowHtmlExporter } = require('../../out/exporters/flow-html-exporter');

describe('FlowHtmlExporter', () => {
  it('renders static page sections and sitemap output for navigation flow input', async () => {
    const exporter = new FlowHtmlExporter();
    const code = await exporter.export({
      flow: {
        id: 'checkout',
        title: 'Checkout',
        entry: 'cart',
        screens: [
          { id: 'cart', page: './screens/cart.tui.yml', title: 'Cart' },
          { id: 'shipping', page: './screens/shipping.tui.yml', title: 'Shipping' }
        ],
        transitions: []
      }
    }, { format: 'html-flow' });

    assert.ok(code.includes('<!-- page: /index.html -->'));
    assert.ok(code.includes('<!-- file: sitemap.xml -->'));
    assert.ok(code.includes('<loc>/screens/shipping</loc>'));
  });
});
