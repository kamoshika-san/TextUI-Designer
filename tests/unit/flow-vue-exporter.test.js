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
          { id: 'shipping', page: './screens/shipping.tui.yml', title: 'Shipping' }
        ],
        transitions: []
      }
    }, { format: 'vue-flow' });

    assert.ok(code.includes('createRouter'));
    assert.ok(code.includes("{ path: '/', component: CartPage }"));
    assert.ok(code.includes("{ path: '/screens/shipping', component: ShippingPage }"));
  });
});
