'use strict';

const assert = require('assert');

describe('semantic diff v2 transition scan', () => {
  let transitionScan;
  let structureDiff;

  before(() => {
    structureDiff = require('../../out/core/diff/structure-diff');
    transitionScan = require('../../out/core/diff/v2-diff-transition-scan');
  });

  function makeDoc(id, transitions) {
    const dsl = { page: { id, title: 'T', layout: 'stack', components: [] } };
    if (transitions !== undefined) dsl.page.transitions = transitions;
    return structureDiff.createNormalizedDiffDocument(dsl, { side: 'previous' });
  }

  it('returns empty when no transitions on either side', () => {
    const result = transitionScan.scanTransitionDiffs(makeDoc('s1'), makeDoc('s1'));
    assert.deepStrictEqual(result, []);
  });

  it('emits transition_added for new transition', () => {
    const prev = makeDoc('s1', []);
    const next = makeDoc('s1', [{ from: 'A', to: 'B', trigger: 'submit' }]);
    const result = transitionScan.scanTransitionDiffs(prev, next);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].decision.diff_event, 'transition_added');
    assert.strictEqual(result[0].decision.target_id, 'A→B:submit');
    assert.strictEqual(result[0].decision.confidence_band, 'high');
  });

  it('emits transition_removed for deleted transition', () => {
    const prev = makeDoc('s1', [{ from: 'A', to: 'B', trigger: 'submit' }]);
    const next = makeDoc('s1', []);
    const result = transitionScan.scanTransitionDiffs(prev, next);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].decision.diff_event, 'transition_removed');
  });

  it('emits transition_edge_changed when label changes', () => {
    const prev = makeDoc('s1', [{ from: 'A', to: 'B', trigger: 'click', label: 'old' }]);
    const next = makeDoc('s1', [{ from: 'A', to: 'B', trigger: 'click', label: 'new' }]);
    const result = transitionScan.scanTransitionDiffs(prev, next);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].decision.diff_event, 'transition_edge_changed');
  });

  it('emits transition_edge_changed when condition changes', () => {
    const prev = makeDoc('s1', [{ from: 'A', to: 'B', trigger: 'click', condition: 'isValid' }]);
    const next = makeDoc('s1', [{ from: 'A', to: 'B', trigger: 'click', condition: 'isReady' }]);
    const result = transitionScan.scanTransitionDiffs(prev, next);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].decision.diff_event, 'transition_edge_changed');
  });

  it('emits no diff for identical transitions', () => {
    const t = [{ from: 'A', to: 'B', trigger: 'click', label: 'Go' }];
    const result = transitionScan.scanTransitionDiffs(makeDoc('s1', t), makeDoc('s1', t));
    assert.deepStrictEqual(result, []);
  });

  it('handles non-array transitions gracefully', () => {
    const prev = makeDoc('s1');
    const next = makeDoc('s1');
    prev.normalizedDsl.page.transitions = 'invalid';
    const result = transitionScan.scanTransitionDiffs(prev, next);
    assert.deepStrictEqual(result, []);
  });
});
