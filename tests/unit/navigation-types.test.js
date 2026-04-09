const assert = require('assert');

const { isNavigationFlowDSL } = require('../../out/domain/dsl-types');

describe('navigation types', () => {
  it('accepts screens with params and metadata-friendly flow fields', () => {
    const dsl = {
      flow: {
        id: 'support',
        title: 'Support Flow',
        entry: 'start',
        screens: [
          { id: 'start', page: './screens/start.tui.yml', title: 'Start' },
          { id: 'ticket', page: './screens/ticket.tui.yml', title: 'Ticket' }
        ],
        transitions: [
          {
            from: 'start',
            to: 'ticket',
            trigger: 'submit',
            label: 'Open ticket',
            params: ['category', 'priority']
          }
        ]
      }
    };

    assert.strictEqual(isNavigationFlowDSL(dsl), true);
  });

  it('rejects flows with non-string entry ids and transition params', () => {
    const invalid = {
      flow: {
        id: 'broken',
        title: 'Broken Flow',
        entry: 1,
        screens: [{ id: 'start', page: './screens/start.tui.yml' }],
        transitions: [
          { from: 'start', to: 'end', trigger: 'next', params: ['ok', 2] }
        ]
      }
    };

    assert.strictEqual(isNavigationFlowDSL(invalid), false);
  });
});
