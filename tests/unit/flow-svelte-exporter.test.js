const assert = require('assert');
const { FlowSvelteExporter } = require('../../out/exporters/flow-svelte-exporter');

describe('FlowSvelteExporter', () => {
  it('renders SvelteKit-style route blocks for navigation flow input', async () => {
    const exporter = new FlowSvelteExporter();
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
    }, { format: 'svelte-flow' });

    assert.ok(code.includes('// route: src/routes/+page.svelte'));
    assert.ok(code.includes('// route: src/routes/screens/shipping/+page.svelte'));
  });
});
