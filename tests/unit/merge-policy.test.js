const assert = require('assert');

describe('merge policy', () => {
  let policy;

  function makeConflict(overrides = {}) {
    return {
      conflictId: overrides.conflictId || 'conflict:x',
      type: overrides.type || 'same-property-different-value',
      severity: overrides.severity || 's1-notice',
      entityKey: overrides.entityKey || 'property:/page/props/title',
      leftEventIds: ['event:left'],
      rightEventIds: ['event:right'],
      evidence: {
        base: overrides.base,
        left: overrides.left || {
          eventId: 'event:left',
          eventKind: 'update',
          pairingReason: 'deterministic-structural-path',
          fallbackMarker: 'none',
          path: '/page/props/title',
          sourceRef: { side: 'next', entityPath: '/page/props/title' },
          ruleTrace: 'trace:left',
        },
        right: overrides.right || {
          eventId: 'event:right',
          eventKind: 'update',
          pairingReason: 'deterministic-structural-path',
          fallbackMarker: 'none',
          path: '/page/props/subtitle',
          sourceRef: { side: 'next', entityPath: '/page/props/subtitle' },
          ruleTrace: 'trace:right',
        },
      },
      resolutionHint: overrides.resolutionHint || 'manual-review-required',
      status: 'candidate',
      matchingBasis: 'entity-key-and-trace',
      taxonomy: overrides.taxonomy || {
        family: 'semantic-conflict',
        type: overrides.type || 'same-property-different-value',
        impactAxis: 'presentation',
        summaryKey: 'presentation.conflict.same-property-different-value',
        ruleTrace: 'taxonomy',
      },
    };
  }

  before(() => {
    policy = require('../../out/core/three-way/merge-policy');
  });

  it('marks non-overlap conflicts as auto-merge-safe', () => {
    const result = policy.evaluateMergeConflictPolicy(makeConflict({
      resolutionHint: 'manual-review-required',
      left: {
        eventId: 'event:left',
        eventKind: 'update',
        pairingReason: 'deterministic-structural-path',
        fallbackMarker: 'none',
        path: '/page/props/title',
        sourceRef: { side: 'next', entityPath: '/page/props/title' },
      },
      right: {
        eventId: 'event:right',
        eventKind: 'update',
        pairingReason: 'deterministic-structural-path',
        fallbackMarker: 'none',
        path: '/page/components/0/props/label',
        sourceRef: { side: 'next', entityPath: '/page/components/0/props/label' },
      },
    }));

    assert.strictEqual(result.decision, 'auto-merge-safe');
    assert.strictEqual(result.reason, 'non-overlap');
  });

  it('marks reorder-only same-collection changes as auto-merge-safe', () => {
    const result = policy.evaluateMergeConflictPolicy(makeConflict({
      type: 'same-entity-divergent-move',
      left: {
        eventId: 'event:left',
        eventKind: 'reorder',
        pairingReason: 'deterministic-structural-path',
        fallbackMarker: 'none',
        path: '/page/components/0',
        sourceRef: { side: 'next', entityPath: '/page/components/0' },
      },
      right: {
        eventId: 'event:right',
        eventKind: 'reorder',
        pairingReason: 'deterministic-structural-path',
        fallbackMarker: 'none',
        path: '/page/components/1',
        sourceRef: { side: 'next', entityPath: '/page/components/1' },
      },
    }));

    assert.strictEqual(result.decision, 'auto-merge-safe');
    assert.strictEqual(result.reason, 'commutative-reorder');
  });

  it('keeps one-side-noop lane auto-merge-safe when payload already marks it so', () => {
    const result = policy.evaluateMergeConflictPolicy(makeConflict({
      resolutionHint: 'auto-merge-safe',
    }));

    assert.strictEqual(result.decision, 'auto-merge-safe');
    assert.strictEqual(result.reason, 'one-side-noop');
  });

  it('excludes heuristic conflicts from the safe lane', () => {
    const result = policy.evaluateMergeConflictPolicy(makeConflict({
      left: {
        eventId: 'event:left',
        eventKind: 'update',
        pairingReason: 'heuristic-similarity',
        fallbackMarker: 'none',
        path: '/page/props/title',
        sourceRef: { side: 'next', entityPath: '/page/props/title' },
      },
    }));

    assert.strictEqual(result.decision, 'manual-review-required');
    assert.strictEqual(result.reason, 'heuristic-excluded');
  });

  it('excludes permission-sensitive conflicts from the safe lane', () => {
    const result = policy.evaluateMergeConflictPolicy(makeConflict({
      type: 'permission-gate-vs-state-transition',
      taxonomy: {
        family: 'permission-conflict',
        type: 'permission-gate-vs-state-transition',
        impactAxis: 'permission',
        summaryKey: 'permission.conflict.gate-vs-state-transition',
        ruleTrace: 'taxonomy',
      },
    }));

    assert.strictEqual(result.decision, 'manual-review-required');
    assert.strictEqual(result.reason, 'permission-excluded');
  });

  it('defaults ambiguous dependency edges to manual review', () => {
    const result = policy.evaluateMergeConflictPolicy(makeConflict({
      left: {
        eventId: 'event:left',
        eventKind: 'update',
        pairingReason: 'deterministic-structural-path',
        fallbackMarker: 'none',
        path: '/page/components/0',
        sourceRef: { side: 'next', entityPath: '/page/components/0' },
      },
      right: {
        eventId: 'event:right',
        eventKind: 'update',
        pairingReason: 'deterministic-structural-path',
        fallbackMarker: 'none',
        path: '/page/components/0/props/label',
        sourceRef: { side: 'next', entityPath: '/page/components/0/props/label' },
      },
    }));

    assert.strictEqual(result.decision, 'manual-review-required');
    assert.strictEqual(result.reason, 'ambiguous-dependency');
  });
});
