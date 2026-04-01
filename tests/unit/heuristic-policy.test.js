/**
 * HeuristicPolicy tests (T-20260401-503 / M1-1)
 *
 * Verifies:
 * - DEFAULT_HEURISTIC_POLICY produces identical results to prior hard-coded behaviour
 * - Custom policy (minScore, rejectTie=false) changes results as expected
 * - policyHash is present in diff result metadata
 */
'use strict';
const assert = require('assert');

describe('HeuristicPolicy configuration (M1-1)', () => {
  let diff;
  let engineModule;

  before(() => {
    diff = require('../../out/core/textui-core-diff');
    engineModule = require('../../out/core/textui-core-engine');
  });

  function makePrev(components) {
    return diff.createNormalizedDiffDocument(
      { page: { id: 'p', title: 'Prev', layout: 'vertical', components } },
      { side: 'previous' }
    );
  }

  function makeNext(components) {
    return diff.createNormalizedDiffDocument(
      { page: { id: 'p', title: 'Next', layout: 'vertical', components } },
      { side: 'next' }
    );
  }

  // -- Policy compatibility: DEFAULT_POLICY reproduces original behaviour -----

  it('policy compatibility: DEFAULT_POLICY heuristic match behaves like original', () => {
    // Original behaviour: two identical-scalar components → heuristic-similarity
    const prev = makePrev([{ Text: { label: 'hello' } }]);
    const next = makeNext([{ Text: { label: 'hello' } }]);

    const result = diff.createDiffResultSkeleton(prev, next);
    const heuristicEvents = result.events.filter(
      e => e.entityKind === 'component' && e.trace.pairingReason === 'heuristic-similarity'
    );
    assert.ok(heuristicEvents.length >= 1, 'DEFAULT_POLICY should produce heuristic-similarity for matching components');
  });

  it('policy compatibility: DEFAULT_POLICY non-matching components stay unpaired', () => {
    const prev = makePrev([{ Text: { label: 'a' } }]);
    const next = makeNext([{ Text: { label: 'b' } }]);
    const result = diff.createDiffResultSkeleton(prev, next);
    // label differs → score 0 → structural-path pairing (not heuristic)
    const heuristicEvents = result.events.filter(
      e => e.entityKind === 'component' && e.trace.pairingReason === 'heuristic-similarity'
    );
    assert.strictEqual(heuristicEvents.length, 0, 'components with no scalar match should not heuristic-pair');
  });

  // -- Custom policy: higher minScore rejects low-score pairs -----------------

  it('custom policy: minScore=4 rejects score=3 pair (below threshold)', () => {
    const policy = {
      minScore: 4,
      weightScalarExact: 2,
      weightChildSignature: 1,
      weightKeysetMatch: 1,
      requireMutualBest: true,
      rejectTie: true,
    };
    // One matching scalar (label) → score = weightScalarExact(2) + weightKeysetMatch(1) = 3, below minScore=4
    const result = diff.createDiffResultSkeleton(
      makePrev([{ Text: { label: 'a' } }]),
      makeNext([{ Text: { label: 'a' } }]),
      policy
    );
    const heuristicEvents = result.events.filter(
      e => e.entityKind === 'component' && e.trace.pairingReason === 'heuristic-similarity'
    );
    assert.strictEqual(heuristicEvents.length, 0, 'minScore=4 should reject a score-3 pair');
    // Must be routed to below-threshold fallback
    const belowThreshold = result.events.filter(
      e => e.entityKind === 'component' && e.trace.ambiguityReason === 'below-threshold'
    );
    assert.ok(belowThreshold.length >= 1, 'should have below-threshold ambiguity event');
  });

  it('custom policy: rejectTie=false allows tied matches through', () => {
    const policy = {
      minScore: 2,
      weightScalarExact: 2,
      weightChildSignature: 1,
      weightKeysetMatch: 1,
      requireMutualBest: true,
      rejectTie: false,
    };
    // Two next components tied for one previous → normally tie-rejected; here allowed
    const result = diff.createDiffResultSkeleton(
      makePrev([{ Text: { label: 'same' } }]),
      makeNext([
        { Text: { label: 'same' } },
        { Text: { label: 'same' } }
      ]),
      policy
    );
    // With rejectTie=false, tie is not blocked — a match may occur
    // We just verify no tie-best-score fallback exists
    const tieFallback = result.events.filter(
      e => e.trace.ambiguityReason === 'tie-best-score'
    );
    assert.strictEqual(tieFallback.length, 0, 'rejectTie=false should not produce tie-best-score fallback');
  });

  it('custom policy: rejectTie=false also works for reverse-tie candidates', () => {
    const policy = {
      minScore: 2,
      weightScalarExact: 2,
      weightChildSignature: 1,
      weightKeysetMatch: 1,
      requireMutualBest: true,
      rejectTie: false,
    };
    const result = diff.createDiffResultSkeleton(
      makePrev([
        { Text: { label: 'same' } },
        { Text: { label: 'same' } }
      ]),
      makeNext([{ Text: { label: 'same' } }]),
      policy
    );
    const heuristicEvents = result.events.filter(
      e => e.entityKind === 'component' && e.trace.pairingReason === 'heuristic-similarity'
    );
    assert.ok(heuristicEvents.length >= 1, 'rejectTie=false should preserve at least one reverse-tie heuristic match');
  });

  it('compareUi threads heuristicPolicy through the public engine API', () => {
    const engine = new engineModule.TextUICoreEngine();
    const response = engine.compareUi({
      previousDsl: {
        page: {
          id: 'p',
          title: 'Prev',
          layout: 'vertical',
          components: [
            { Text: { value: 'Alpha', variant: 'p' } },
            { Text: { value: 'Beta', variant: 'p' } }
          ]
        }
      },
      nextDsl: {
        page: {
          id: 'p',
          title: 'Next',
          layout: 'vertical',
          components: [
            { Text: { value: 'Beta', variant: 'p' } },
            { Text: { value: 'Alpha', variant: 'p' } }
          ]
        }
      },
      heuristicPolicy: {
        minScore: 6,
        weightScalarExact: 2,
        weightChildSignature: 1,
        weightKeysetMatch: 1,
        requireMutualBest: true,
        rejectTie: true,
      }
    });
    assert.strictEqual(response.ok, true);
    assert.ok(response.result, 'compareUi should return a diff result');
    const belowThreshold = response.result.events.filter(
      e => e.entityKind === 'component' && e.trace.ambiguityReason === 'below-threshold'
    );
    assert.ok(belowThreshold.length >= 1, 'public compareUi API should honor heuristicPolicy overrides');
  });

  // -- policyHash in metadata -------------------------------------------------

  it('policyHash is present in result metadata', () => {
    const result = diff.createDiffResultSkeleton(
      makePrev([]),
      makeNext([])
    );
    assert.ok(typeof result.metadata.policyHash === 'string', 'policyHash must be a string');
    assert.ok(result.metadata.policyHash.length > 0, 'policyHash must not be empty');
  });

  it('policyHash differs between DEFAULT_POLICY and custom policy', () => {
    const resultDefault = diff.createDiffResultSkeleton(
      makePrev([]),
      makeNext([])
    );
    const customPolicy = {
      minScore: 5,
      weightScalarExact: 3,
      weightChildSignature: 2,
      weightKeysetMatch: 2,
      requireMutualBest: true,
      rejectTie: true,
    };
    const resultCustom = diff.createDiffResultSkeleton(
      makePrev([]),
      makeNext([]),
      customPolicy
    );
    assert.notStrictEqual(
      resultDefault.metadata.policyHash,
      resultCustom.metadata.policyHash,
      'different policies should produce different policyHash values'
    );
  });

  it('policyHash is deterministic (same policy → same hash)', () => {
    const policy = {
      minScore: 2,
      weightScalarExact: 2,
      weightChildSignature: 1,
      weightKeysetMatch: 1,
      requireMutualBest: true,
      rejectTie: true,
    };
    const r1 = diff.createDiffResultSkeleton(makePrev([]), makeNext([]), policy);
    const r2 = diff.createDiffResultSkeleton(makePrev([]), makeNext([]), policy);
    assert.strictEqual(r1.metadata.policyHash, r2.metadata.policyHash);
  });
});
