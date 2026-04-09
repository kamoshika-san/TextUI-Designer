const assert = require('assert');
const path = require('path');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

require('ts-node/register/transpile-only');

describe('FlowPreviewPanel', () => {
  let FlowPreviewPanel;
  let buildFlowSemanticDiff;

  before(() => {
    ({ FlowPreviewPanel } = require(path.resolve(__dirname, '../../src/renderer/components/FlowPreviewPanel.tsx')));
    ({ buildFlowSemanticDiff } = require(path.resolve(__dirname, '../../src/services/semantic-diff/flow-semantic-diff-engine.ts')));
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

  it('renders flow diff statuses for changed, added, and removed entities', () => {
    const diffResult = buildFlowSemanticDiff({
      previousDsl: {
        flow: {
          id: 'checkout',
          title: 'Checkout Flow',
          entry: 'cart',
          screens: [
            { id: 'cart', page: './screens/cart.tui.yml', title: 'Cart' },
            { id: 'shipping', page: './screens/shipping.tui.yml', title: 'Shipping' }
          ],
          transitions: [
            { from: 'cart', to: 'shipping', trigger: 'next', label: 'Continue' }
          ]
        }
      },
      nextDsl: {
        flow: {
          id: 'checkout',
          title: 'Checkout Flow v2',
          entry: 'shipping',
          screens: [
            { id: 'shipping', page: './screens/shipping.tui.yml', title: 'Shipping' },
            { id: 'confirm', page: './screens/confirm.tui.yml', title: 'Confirm' }
          ],
          transitions: [
            { from: 'shipping', to: 'confirm', trigger: 'next', label: 'Review' }
          ]
        }
      }
    });

    const html = renderToStaticMarkup(
      React.createElement(FlowPreviewPanel, {
        flowDsl: diffResult.normalization.next.normalizedDsl,
        diffResult,
        onJumpToDsl: () => {}
      })
    );

    assert.ok(html.includes('Flow Diff: CHANGED'));
    assert.ok(html.includes('ADDED'));
    assert.ok(html.includes('REMOVED'));
    assert.ok(html.includes('CHANGED'));
  });
});
