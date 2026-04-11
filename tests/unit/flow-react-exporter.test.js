const assert = require('assert');
const { FlowReactExporter } = require('../../out/exporters/flow-react-exporter');

describe('FlowReactExporter', () => {
  it('renders a React Router bundle for a navigation flow sample', async () => {
    const exporter = new FlowReactExporter();
    const code = await exporter.export({
      flow: {
        id: 'checkout-flow',
        version: '2',
        title: 'Checkout Flow',
        entry: 'cart',
        screens: [
          { id: 'cart', page: './screens/cart.tui.yml', title: 'Cart' },
          { id: 'shipping', page: './screens/shipping.tui.yml', title: 'Shipping', kind: 'terminal', terminal: { kind: 'success', outcome: 'approved' } }
        ],
        transitions: [
          { id: 't-cart-shipping', from: 'cart', to: 'shipping', trigger: 'next', kind: 'forward' }
        ]
      }
    }, { format: 'react-flow' });

    assert.ok(code.includes('// generated: router.tsx'));
    assert.ok(code.includes('createBrowserRouter'));
    assert.ok(code.includes("{ path: '/', element: <CartPage />, handle: { screenId: 'cart', kind: 'screen', terminalKind: undefined } }"));
    assert.ok(code.includes("handle: { screenId: 'shipping', kind: 'terminal', terminalKind: 'success' }"));
    assert.ok(code.includes('// generated: App.tsx'));
    assert.ok(code.includes('export function CartPage()'));
    assert.ok(code.includes('Outgoing Transitions: t-cart-shipping'));
    assert.ok(code.includes("version: '2'"));
  });

  it('preserves parameterized route segments derived from page file names', async () => {
    const exporter = new FlowReactExporter();
    const code = await exporter.export({
      flow: {
        id: 'orders',
        title: 'Orders',
        entry: 'dashboard',
        screens: [
          { id: 'dashboard', page: './screens/dashboard.tui.yml', title: 'Dashboard' },
          { id: 'order-detail', page: './screens/order/[order_id].tui.yml', title: 'Order Detail' }
        ],
        transitions: [
          { from: 'dashboard', to: 'order-detail', trigger: 'open' }
        ]
      }
    }, { format: 'react-flow' });

    assert.ok(code.includes("{ path: '/screens/order/:order_id', element: <OrderDetailPage />, handle: { screenId: 'order-detail', kind: 'screen', terminalKind: undefined } }"));
  });
});
