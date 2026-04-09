'use strict';

const assert = require('assert');

describe('FlowDiffNormalizer', () => {
  let normalizeFlowDiff;

  before(() => {
    ({ normalizeFlowDiff } = require('../../out/core/diff-normalization/flow-normalizer'));
  });

  function makeFlow(overrides = {}) {
    return {
      flow: {
        id: 'checkout-flow',
        title: 'Checkout Flow',
        entry: 'cart',
        screens: [
          { id: 'cart', page: './screens/cart.tui.yml', title: 'Cart' },
          { id: 'shipping', page: './screens/shipping.tui.yml', title: 'Shipping' }
        ],
        transitions: [
          { from: 'cart', to: 'shipping', trigger: 'next', label: 'Continue' }
        ],
        ...overrides
      }
    };
  }

  it('creates normalized flow compare documents with deterministic inventory', () => {
    const result = normalizeFlowDiff({
      previousDsl: makeFlow(),
      nextDsl: makeFlow(),
      previousSourcePath: 'prev.tui.flow.yml',
      nextSourcePath: 'next.tui.flow.yml'
    });

    assert.strictEqual(result.previous.metadata.normalizationState, 'normalized-flow');
    assert.strictEqual(result.previous.flow.screenCount, 2);
    assert.strictEqual(result.previous.screens[0].path, '/flow/screens/0');
    assert.strictEqual(result.previous.transitions[0].key, 'cart::next::shipping');
    assert.strictEqual(result.metadata.eventCount, 0);
  });

  it('emits flow update events plus screen and transition add/remove events', () => {
    const result = normalizeFlowDiff({
      previousDsl: makeFlow(),
      nextDsl: makeFlow({
        title: 'Checkout Flow v2',
        entry: 'shipping',
        screens: [
          { id: 'shipping', page: './screens/shipping.tui.yml', title: 'Shipping' },
          { id: 'confirm', page: './screens/confirm.tui.yml', title: 'Confirm' }
        ],
        transitions: [
          { from: 'shipping', to: 'confirm', trigger: 'next', label: 'Review' }
        ]
      })
    });

    assert.deepStrictEqual(
      result.events.map(event => `${event.kind}:${event.entity}:${event.entity === 'flow' ? event.field : event.def.id ?? event.def.key}`),
      [
        'update:flow:title',
        'update:flow:entry',
        'remove:screen:cart',
        'add:screen:confirm',
        'remove:transition:cart::next::shipping',
        'add:transition:shipping::next::confirm'
      ]
    );
  });
});
