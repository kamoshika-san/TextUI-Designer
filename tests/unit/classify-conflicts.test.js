const assert = require('assert');

describe('classifyConflicts', () => {
  let classifier;

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

  function makeConflict(overrides = {}) {
    return {
      conflictId: overrides.conflictId || 'conflict:x',
      entityKey: overrides.entityKey || 'property:/page/props/title',
      status: 'candidate',
      matchingBasis: 'entity-key-and-trace',
      leftEventIds: ['event:left'],
      rightEventIds: ['event:right'],
      evidence: {
        left: overrides.left || [makeEvidence()],
        right: overrides.right || [makeEvidence({ eventId: 'event:y' })],
      },
    };
  }

  before(() => {
    classifier = require('../../out/core/three-way/classify-conflicts');
  });

  it('classifies structural rename-vs-replace conflicts on the structure axis', () => {
    const result = classifier.classifyConflict(makeConflict({
      entityKey: 'component:Text:item-1',
      left: [makeEvidence({ kind: 'rename' })],
      right: [makeEvidence({ kind: 'remove+add', fallbackMarker: 'remove-add-fallback' })],
    }));

    assert.strictEqual(result.taxonomy.family, 'structural-conflict');
    assert.strictEqual(result.taxonomy.type, 'rename-vs-replace');
    assert.strictEqual(result.taxonomy.impactAxis, 'structure');
  });

  it('classifies semantic heuristic-vs-deterministic disagreement on the behavior axis', () => {
    const result = classifier.classifyConflict(makeConflict({
      entityKey: 'component:Input:email',
      left: [makeEvidence({ kind: 'update', pairingReason: 'heuristic-similarity' })],
      right: [makeEvidence({ kind: 'update', pairingReason: 'deterministic-explicit-id' })],
    }));

    assert.strictEqual(result.taxonomy.family, 'semantic-conflict');
    assert.strictEqual(result.taxonomy.type, 'heuristic-vs-deterministic-disagreement');
    assert.strictEqual(result.taxonomy.impactAxis, 'behavior');
  });

  it('classifies permission gate vs state transition conflicts on the permission axis', () => {
    const result = classifier.classifyConflict(makeConflict({
      entityKey: 'component:Button:save',
      left: [makeEvidence({
        previousSourceRef: { side: 'previous', entityPath: '/page/components/0/props/permissions/canSave' },
        nextSourceRef: { side: 'next', entityPath: '/page/components/0/props/permissions/canSave' },
      })],
      right: [makeEvidence({
        previousSourceRef: { side: 'previous', entityPath: '/page/components/0/props/transitions/submit' },
        nextSourceRef: { side: 'next', entityPath: '/page/components/0/props/transitions/submit' },
      })],
    }));

    assert.strictEqual(result.taxonomy.family, 'permission-conflict');
    assert.strictEqual(result.taxonomy.type, 'permission-gate-vs-state-transition');
    assert.strictEqual(result.taxonomy.impactAxis, 'permission');
  });

  it('defaults nearby non-structural property disagreements to same-property-different-value', () => {
    const result = classifier.classifyConflict(makeConflict({
      entityKey: 'property:/page/props/title',
      left: [makeEvidence({
        previousSourceRef: { side: 'previous', entityPath: '/page/props/title' },
        nextSourceRef: { side: 'next', entityPath: '/page/props/title' },
      })],
      right: [makeEvidence({
        previousSourceRef: { side: 'previous', entityPath: '/page/props/title' },
        nextSourceRef: { side: 'next', entityPath: '/page/props/title' },
      })],
    }));

    assert.strictEqual(result.taxonomy.family, 'semantic-conflict');
    assert.strictEqual(result.taxonomy.type, 'same-property-different-value');
    assert.strictEqual(result.taxonomy.impactAxis, 'presentation');
  });
});
