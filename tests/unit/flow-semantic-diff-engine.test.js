'use strict';

const assert = require('assert');

describe('FlowSemanticDiffEngine', () => {
  let buildFlowSemanticDiff;
  let createFlowDiagramDiffState;

  before(() => {
    ({ buildFlowSemanticDiff, createFlowDiagramDiffState } = require('../../out/services/semantic-diff/flow-semantic-diff-engine'));
  });

  it('produces deterministic findings and diagram state for flow diffs', () => {
    const result = buildFlowSemanticDiff({
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

    assert.strictEqual(result.findings.length, 6);
    assert.ok(result.findings.every(finding => finding.confidence.band === 'high'));

    const diagramState = createFlowDiagramDiffState(result);
    assert.strictEqual(diagramState.flowChanged, true);
    assert.strictEqual(diagramState.screenStates.cart, 'removed');
    assert.strictEqual(diagramState.screenStates.confirm, 'added');
    assert.strictEqual(diagramState.transitionStates['cart::next::shipping'], 'removed');
    assert.strictEqual(diagramState.transitionStates['shipping::next::confirm'], 'added');
  });

  it('tracks changed transitions by stable id and captures terminal metadata changes', () => {
    const result = buildFlowSemanticDiff({
      previousDsl: {
        flow: {
          id: 'checkout',
          version: '2',
          title: 'Checkout Flow',
          entry: 'review',
          policy: { loops: 'warn', terminalScreensRequired: true },
          screens: [
            { id: 'review', page: './screens/review.tui.yml', title: 'Review', kind: 'review' },
            { id: 'approval', page: './screens/approval.tui.yml', title: 'Approval', kind: 'terminal', terminal: { kind: 'success', outcome: 'approved' } }
          ],
          transitions: [
            { id: 't-review-approval', from: 'review', to: 'approval', trigger: 'submit', label: 'Submit', kind: 'forward' }
          ]
        }
      },
      nextDsl: {
        flow: {
          id: 'checkout',
          version: '2',
          title: 'Checkout Flow',
          entry: 'review',
          policy: { loops: 'allow', terminalScreensRequired: true },
          screens: [
            { id: 'review', page: './screens/review.tui.yml', title: 'Review', kind: 'review' },
            { id: 'approval', page: './screens/approval.tui.yml', title: 'Approval', kind: 'terminal', terminal: { kind: 'failure', outcome: 'manual-review' } }
          ],
          transitions: [
            { id: 't-review-approval', from: 'review', to: 'approval', trigger: 'approve', label: 'Approve', kind: 'escalation', guard: { expression: 'risk.accepted' } }
          ]
        }
      }
    });

    const diagramState = createFlowDiagramDiffState(result);
    assert.strictEqual(diagramState.screenStates.approval, 'changed');
    assert.strictEqual(diagramState.transitionStates['t-review-approval'], 'changed');
    assert.ok(result.findings.some(finding => finding.target.entity === 'flow' && finding.target.key === 'loopPolicy'));
  });
});
