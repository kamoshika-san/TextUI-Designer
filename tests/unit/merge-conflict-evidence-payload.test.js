const assert = require('assert');

describe('merge conflict evidence payload', () => {
  let threeWay;

  function makeEvidence(overrides = {}) {
    return {
      eventId: overrides.eventId || 'event:x',
      kind: overrides.kind || 'update',
      pairingReason: overrides.pairingReason || 'deterministic-structural-path',
      fallbackMarker: overrides.fallbackMarker || 'none',
      ambiguityReason: overrides.ambiguityReason,
      previousSourceRef: overrides.previousSourceRef,
      nextSourceRef: overrides.nextSourceRef,
    };
  }

  function makeCandidateConflict(overrides = {}) {
    return {
      conflictId: overrides.conflictId || 'conflict:x',
      entityKey: overrides.entityKey || 'property:/page/props/title',
      status: 'candidate',
      matchingBasis: 'entity-key-and-trace',
      leftEventIds: ['event:left'],
      rightEventIds: ['event:right'],
      evidence: {
        base: overrides.base,
        left: overrides.left || [makeEvidence({ eventId: 'event:left' })],
        right: overrides.right || [makeEvidence({ eventId: 'event:right' })],
      },
    };
  }

  before(() => {
    threeWay = require('../../out/core/three-way/build-three-way-diff');
  });

  it('builds a structural conflict payload with base, left, and right evidence', () => {
    const conflict = threeWay.materializeMergeConflict(makeCandidateConflict({
      entityKey: 'component:Text:hero',
      base: [makeEvidence({
        eventId: 'base:event:left',
        previousSourceRef: { side: 'previous', entityPath: '/page/components/0' },
      })],
      left: [makeEvidence({
        eventId: 'event:left',
        kind: 'rename',
        nextSourceRef: { side: 'next', entityPath: '/page/components/0' },
      })],
      right: [makeEvidence({
        eventId: 'event:right',
        kind: 'remove+add',
        fallbackMarker: 'remove-add-fallback',
        nextSourceRef: { side: 'next', entityPath: '/page/components/0' },
      })],
    }));

    assert.ok(conflict);
    assert.strictEqual(conflict.type, 'rename-vs-replace');
    assert.strictEqual(conflict.severity, 's3-critical');
    assert.strictEqual(conflict.resolutionHint, 'manual-review-required');
    assert.ok(conflict.evidence.base);
    assert.ok(conflict.evidence.left.eventId);
    assert.ok(conflict.evidence.right.eventId);
    assert.ok(conflict.evidence.left.ruleTrace);
    assert.ok(conflict.evidence.right.sourceRef);
  });

  it('builds a semantic conflict payload with conservative auto-merge-safe hint', () => {
    const conflict = threeWay.materializeMergeConflict(makeCandidateConflict({
      entityKey: 'property:/page/props/title',
      base: [makeEvidence({
        eventId: 'base:event:left',
        previousSourceRef: { side: 'previous', entityPath: '/page/props/title' },
      })],
      left: [makeEvidence({
        eventId: 'event:left',
        previousSourceRef: { side: 'previous', entityPath: '/page/props/title' },
        nextSourceRef: { side: 'next', entityPath: '/page/props/title' },
      })],
      right: [makeEvidence({
        eventId: 'event:right',
        previousSourceRef: { side: 'previous', entityPath: '/page/props/title' },
        nextSourceRef: { side: 'next', entityPath: '/page/props/title' },
      })],
    }));

    assert.ok(conflict);
    assert.strictEqual(conflict.type, 'same-property-different-value');
    assert.strictEqual(conflict.severity, 's1-notice');
    assert.strictEqual(conflict.resolutionHint, 'auto-merge-safe');
    assert.strictEqual(conflict.evidence.left.eventKind, 'update');
    assert.strictEqual(conflict.evidence.right.eventKind, 'update');
  });

  it('builds a permission conflict payload with permission-oriented evidence paths', () => {
    const permissionConflict = threeWay.materializeMergeConflict(makeCandidateConflict({
      entityKey: 'component:Button:save',
      base: [makeEvidence({
        eventId: 'base:event:left',
        previousSourceRef: { side: 'previous', entityPath: '/page/components/0/props/permissions/canSave' },
      })],
      left: [makeEvidence({
        eventId: 'event:left',
        previousSourceRef: { side: 'previous', entityPath: '/page/components/0/props/permissions/canSave' },
        nextSourceRef: { side: 'next', entityPath: '/page/components/0/props/permissions/canSave' },
      })],
      right: [makeEvidence({
        eventId: 'event:right',
        previousSourceRef: { side: 'previous', entityPath: '/page/components/0/props/transitions/submit' },
        nextSourceRef: { side: 'next', entityPath: '/page/components/0/props/transitions/submit' },
      })],
    }));

    assert.strictEqual(permissionConflict.type, 'permission-gate-vs-state-transition');
    assert.strictEqual(permissionConflict.evidence.left.path.includes('/permissions'), true);
    assert.strictEqual(permissionConflict.evidence.right.path.includes('/transitions'), true);
    assert.strictEqual(permissionConflict.evidence.left.ruleTrace, permissionConflict.taxonomy.ruleTrace);
    assert.strictEqual(permissionConflict.severity, 's3-critical');
    assert.strictEqual(permissionConflict.resolutionHint, 'manual-review-required');
  });
});
