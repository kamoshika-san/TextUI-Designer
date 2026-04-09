const assert = require('assert');
const path = require('path');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

require('ts-node/register/transpile-only');

describe('FlowPreviewPanel', () => {
  let FlowPreviewPanel;

  before(() => {
    ({ FlowPreviewPanel } = require(path.resolve(__dirname, '../../src/renderer/components/FlowPreviewPanel.tsx')));
  });

  it('renders navigation flow metadata, nodes, and labeled edges', () => {
    const html = renderToStaticMarkup(
      React.createElement(FlowPreviewPanel, {
        flowDsl: {
          flow: {
            id: 'checkout',
            title: 'Checkout Flow',
            entry: 'cart',
            screens: [
              { id: 'cart', page: './screens/cart.tui.yml', title: 'Cart' },
              { id: 'confirm', page: './screens/confirm.tui.yml', title: 'Confirm' }
            ],
            transitions: [
              { from: 'cart', to: 'confirm', trigger: 'next', label: 'Continue' }
            ]
          }
        },
        onJumpToDsl: () => {}
      })
    );

    assert.ok(html.includes('Checkout Flow'));
    assert.ok(html.includes('Flow ID: checkout'));
    assert.ok(html.includes('Entry'));
    assert.ok(html.includes('Continue'));
    assert.ok(html.includes('./screens/cart.tui.yml'));
    assert.ok(html.includes('Page Preview Context'));
    assert.ok(html.includes('Jump to flow screen'));
    assert.ok(html.includes('tabindex="0"'));
  });
});
