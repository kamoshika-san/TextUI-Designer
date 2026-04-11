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
          { id: 'shipping', page: './screens/shipping.tui.yml', title: 'Shipping', kind: 'terminal', terminal: { kind: 'success', outcome: 'done' } }
        ],
        transitions: [
          { id: 't-cart-shipping', from: 'cart', to: 'shipping', trigger: 'next', kind: 'forward' }
        ]
      }
    }, { format: 'svelte-flow' });

    assert.ok(code.includes('// route: src/routes/+page.svelte'));
    assert.ok(code.includes('// route: src/routes/screens/shipping/+page.svelte'));
    assert.ok(code.includes('Outgoing Transitions: t-cart-shipping'));
    assert.ok(code.includes('Terminal Kind: success'));
  });

  it('throws when export is called with a non-navigation DSL shape', async () => {
    const exporter = new FlowSvelteExporter();

    await assert.rejects(
      exporter.export({ page: { id: 'not-a-flow' } }, { format: 'svelte-flow' }),
      /FlowSvelteExporter requires a navigation flow DSL/
    );
  });

  it('returns the expected file extension', () => {
    const exporter = new FlowSvelteExporter();
    assert.strictEqual(exporter.getFileExtension(), '.svelte');
  });
});
