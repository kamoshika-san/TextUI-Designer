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

  it('accepts the v2 graph-first navigation shape with policy, terminal, and guard metadata', () => {
    const dsl = {
      flow: {
        id: 'enterprise-v2',
        version: '2',
        title: 'Enterprise v2',
        entry: 'welcome',
        policy: {
          loops: 'warn',
          terminalScreensRequired: true
        },
        screens: [
          { id: 'welcome', page: 'welcome-page', kind: 'screen', tags: ['entry'] },
          { id: 'review', page: 'review-page', kind: 'review' },
          {
            id: 'launched',
            page: 'launch-page',
            kind: 'terminal',
            terminal: { kind: 'success', label: 'Customer live' }
          }
        ],
        transitions: [
          {
            id: 't-welcome-review',
            from: 'welcome',
            to: 'review',
            trigger: 'submit',
            kind: 'forward',
            guard: { expression: 'profileComplete', params: ['tenantId'] }
          },
          {
            id: 't-review-launched',
            from: 'review',
            to: 'launched',
            trigger: 'approve',
            kind: 'branch',
            tags: ['terminal-path']
          }
        ]
      }
    };

    assert.strictEqual(isNavigationFlowDSL(dsl), true);
  });

  it('rejects invalid enum metadata in the v2 graph-first shape', () => {
    const invalidCases = [
      {
        flow: {
          id: 'bad-version',
          version: 'banana',
          title: 'Bad Version',
          entry: 'welcome',
          screens: [{ id: 'welcome', page: 'welcome-page' }],
          transitions: []
        }
      },
      {
        flow: {
          id: 'bad-policy',
          version: '2',
          title: 'Bad Policy',
          entry: 'welcome',
          policy: { loops: 'banana' },
          screens: [{ id: 'welcome', page: 'welcome-page' }],
          transitions: []
        }
      },
      {
        flow: {
          id: 'bad-screen-kind',
          version: '2',
          title: 'Bad Screen Kind',
          entry: 'welcome',
          screens: [{ id: 'welcome', page: 'welcome-page', kind: 'banana' }],
          transitions: []
        }
      },
      {
        flow: {
          id: 'bad-terminal-kind',
          version: '2',
          title: 'Bad Terminal Kind',
          entry: 'done',
          screens: [{
            id: 'done',
            page: 'done-page',
            kind: 'terminal',
            terminal: { kind: 'banana' }
          }],
          transitions: []
        }
      },
      {
        flow: {
          id: 'bad-transition-kind',
          version: '2',
          title: 'Bad Transition Kind',
          entry: 'welcome',
          screens: [
            { id: 'welcome', page: 'welcome-page' },
            { id: 'done', page: 'done-page' }
          ],
          transitions: [{
            from: 'welcome',
            to: 'done',
            trigger: 'next',
            kind: 'banana'
          }]
        }
      }
    ];

    invalidCases.forEach(dsl => {
      assert.strictEqual(isNavigationFlowDSL(dsl), false);
    });
  });
});
