const assert = require('assert');

const { isNavigationFlowDSL } = require('../../out/domain/dsl-types');

describe('navigation DSL types', () => {
  it('accepts the Phase 1 canonical navigation flow shape', () => {
    const dsl = {
      flow: {
        id: 'checkout',
        title: 'Checkout Flow',
        entry: 'cart',
        screens: [
          { id: 'cart', page: 'cart-page', title: 'Cart' },
          { id: 'confirm', page: 'confirm-page' }
        ],
        transitions: [
          { from: 'cart', to: 'confirm', trigger: 'next', label: 'Proceed', params: ['coupon'] }
        ]
      }
    };

    assert.strictEqual(isNavigationFlowDSL(dsl), true);
  });

  it('rejects invalid screen and transition shapes', () => {
    const invalid = {
      flow: {
        id: 'broken',
        title: 'Broken Flow',
        entry: 'a',
        screens: [{ id: 'a', page: 42 }],
        transitions: [{ from: 'a', to: 'b' }]
      }
    };

    assert.strictEqual(isNavigationFlowDSL(invalid), false);
  });
});
