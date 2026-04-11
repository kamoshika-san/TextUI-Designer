const assert = require('assert');
const { FlowVueExporter } = require('../../out/exporters/flow-vue-exporter');

describe('FlowVueExporter', () => {
  it('renders Vue Router routes for navigation flow input', async () => {
    const exporter = new FlowVueExporter();
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
    }, { format: 'vue-flow' });

    assert.ok(code.includes('createRouter'));
    assert.ok(code.includes("{ path: '/', component: CartPage }"));
    assert.ok(code.includes("{ path: '/screens/shipping', component: ShippingPage }"));
    assert.ok(code.includes('Outgoing Transitions: t-cart-shipping'));
    assert.ok(code.includes('Terminal Kind: success'));
  });

  it('throws when export is called with a non-navigation DSL shape', async () => {
    const exporter = new FlowVueExporter();

    await assert.rejects(
      exporter.export({ page: { id: 'not-a-flow' } }, { format: 'vue-flow' }),
      /FlowVueExporter requires a navigation flow DSL/
    );
  });

  it('returns the expected file extension', () => {
    const exporter = new FlowVueExporter();
    assert.strictEqual(exporter.getFileExtension(), '.ts');
  });
});
