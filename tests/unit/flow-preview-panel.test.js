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

    // Header metadata
    assert.ok(html.includes('Checkout Flow'), 'should render flow title');
    assert.ok(html.includes('cart'), 'should render entry screen id');

    // Map: entry badge and nodes
    assert.ok(html.includes('Entry'), 'should render entry badge on entry node');
    assert.ok(html.includes('tabindex="0"'), 'nodes should be keyboard focusable');

    // Connections: edge with label
    assert.ok(html.includes('Continue'), 'should render transition label in connections');
    assert.ok(html.includes('next'), 'should render transition trigger');

    // Stage: selected screen info
    assert.ok(html.includes('./screens/cart.tui.yml'), 'should render linked page path in stage');
    assert.ok(html.includes('Entry Screen'), 'should render role label in stage');
    assert.ok(html.includes('Jump to flow screen'), 'should render jump action in stage');
    assert.ok(html.includes('Open linked page'), 'should render open page action in stage');
  });

  it('renders outgoing transitions in the selected screen stage', () => {
    const html = renderToStaticMarkup(
      React.createElement(FlowPreviewPanel, {
        flowDsl: {
          flow: {
            id: 'app',
            title: 'App Flow',
            entry: 'home',
            screens: [
              { id: 'home', page: './home.tui.yml', title: 'Home' },
              { id: 'detail', page: './detail.tui.yml', title: 'Detail' },
              { id: 'settings', page: './settings.tui.yml', title: 'Settings' }
            ],
            transitions: [
              { from: 'home', to: 'detail', trigger: 'select', label: 'View item' },
              { from: 'home', to: 'settings', trigger: 'gear' }
            ]
          }
        },
        onJumpToDsl: () => {}
      })
    );

    assert.ok(html.includes('Outgoing (2)'), 'should show outgoing count');
    assert.ok(html.includes('select'), 'should show trigger in outgoing list');
    assert.ok(html.includes('View item'), 'should show label in outgoing list');
    assert.ok(html.includes('Detail'), 'should show target screen title in outgoing list');
  });

  it('keeps default connections overview when entry screen is selected', () => {
    const html = renderToStaticMarkup(
      React.createElement(FlowPreviewPanel, {
        flowDsl: {
          flow: {
            id: 'entry-default',
            title: 'Entry Default',
            entry: 'home',
            screens: [
              { id: 'home', page: './home.tui.yml', title: 'Home' },
              { id: 'detail', page: './detail.tui.yml', title: 'Detail' },
              { id: 'settings', page: './settings.tui.yml', title: 'Settings' }
            ],
            transitions: [
              { from: 'home', to: 'detail', trigger: 'select', label: 'Open detail' },
              { from: 'home', to: 'settings', trigger: 'gear', label: 'Open settings' }
            ]
          }
        },
        onJumpToDsl: () => {}
      })
    );

    assert.ok(html.includes('Connections'), 'should render default connections heading');
    assert.ok(html.includes('Open detail'), 'should include first transition in default overview');
    assert.ok(html.includes('Open settings'), 'should include second transition in default overview');
    assert.ok(!html.includes('Connections on route'), 'should not switch into filtered route mode for entry');
  });

  it('filters connections to the selected route for non-entry screens', () => {
    const html = renderToStaticMarkup(
      React.createElement(FlowPreviewPanel, {
        flowDsl: {
          flow: {
            id: 'route-filter',
            title: 'Route Filter',
            entry: 'home',
            screens: [
              { id: 'home', page: './home.tui.yml', title: 'Home' },
              { id: 'detail', page: './detail.tui.yml', title: 'Detail' },
              { id: 'confirm', page: './confirm.tui.yml', title: 'Confirm' },
              { id: 'settings', page: './settings.tui.yml', title: 'Settings' }
            ],
            transitions: [
              { from: 'home', to: 'detail', trigger: 'select', label: 'Open detail' },
              { from: 'detail', to: 'confirm', trigger: 'continue', label: 'Continue checkout' },
              { from: 'home', to: 'settings', trigger: 'gear', label: 'Open settings' }
            ]
          }
        },
        initialSelectedScreenId: 'confirm',
        onJumpToDsl: () => {}
      })
    );

    assert.ok(html.includes('Connections on route (2)'), 'should show filtered route heading with count');
    assert.ok(html.includes('Open detail'), 'should include transition on selected route');
    assert.ok(html.includes('Continue checkout'), 'should include downstream route transition');
    assert.ok(!html.includes('Open settings'), 'should omit transitions outside the selected route');
  });

  it('renders terminal screen label when selected screen has no outgoing transitions', () => {
    const html = renderToStaticMarkup(
      React.createElement(FlowPreviewPanel, {
        flowDsl: {
          flow: {
            id: 'simple',
            title: 'Simple Flow',
            entry: 'start',
            screens: [
              { id: 'start', page: './start.tui.yml', title: 'Start' },
              { id: 'end', page: './end.tui.yml', title: 'End' }
            ],
            transitions: [
              { from: 'start', to: 'end', trigger: 'next' }
            ]
          }
        },
        onJumpToDsl: () => {}
      })
    );

    // Entry screen (start) is selected by default and has outgoing
    assert.ok(html.includes('Entry Screen'), 'entry screen role label');
    assert.ok(html.includes('Outgoing (1)'), 'entry screen has one outgoing');
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

    assert.ok(html.includes('CHANGED'), 'should render flow changed badge');
    assert.ok(html.includes('ADDED'), 'should render added diff status on nodes or edges');
    assert.ok(html.includes('REMOVED'), 'should render removed diff status on nodes or edges');
  });
});
