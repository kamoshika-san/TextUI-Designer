/**
 * HH-MC series: ambiguity deterministic fallback tests (T-20260401-502 / M1-3)
 *
 * Verifies that tie, multi-candidate, and below-threshold ambiguities all
 * produce pairingReason:'unpaired' / fallbackMarker:'remove-add-fallback' with
 * the correct ambiguityReason, and that normal unique matches are NOT affected.
 *
 * T-016 note: "fallback" here is the **diff/heuristic pairing** fallback marker in `textui-core-diff`,
 * not the HtmlExporter `useReactRender:false` compatibility lane. These tests must stay because
 * Primary HTML export tests cannot observe `remove-add-fallback` / `ambiguityReason` pairing traces.
 */
'use strict';
const assert = require('assert');

describe('heuristic ambiguity deterministic fallback (HH-MC series)', () => {
  let diff;

  before(() => {
    diff = require('../../out/core/textui-core-diff');
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

  function componentEvents(result) {
    return result.events.filter(e => e.entityKind === 'component');
  }

  // HH-MC01: tie-best-score → remove-add-fallback with ambiguityReason='tie-best-score'
  // Contract: only exercised via diff skeleton — no HTML exporter involvement.
  it('HH-MC01: tie-best-score — two next candidates equally match a previous → remove-add-fallback', () => {
    // previous: one Text component with label 'hello'
    // next: two identical Text components both with label 'hello' (tied)
    const result = diff.createDiffResultSkeleton(
      makePrev([
        { Text: { label: 'hello' } }
      ]),
      makeNext([
        { Text: { label: 'hello' } },
        { Text: { label: 'hello' } }
      ])
    );

    const events = componentEvents(result);
    // The previous component scored equally against two next components → tie
    // Must NOT be heuristic-similarity; must be unpaired/remove-add-fallback
    const fallbackEvents = events.filter(
      e => e.trace.fallbackMarker === 'remove-add-fallback' && e.trace.ambiguityReason === 'tie-best-score'
    );
    assert.ok(
      fallbackEvents.length >= 1,
      `expected at least 1 event with fallbackMarker:'remove-add-fallback' and ambiguityReason:'tie-best-score', got ${JSON.stringify(events.map(e => ({ kind: e.kind, pairingReason: e.trace.pairingReason, fallbackMarker: e.trace.fallbackMarker, ambiguityReason: e.trace.ambiguityReason })))}`
    );
    for (const e of fallbackEvents) {
      assert.strictEqual(e.trace.pairingReason, 'unpaired');
      assert.strictEqual(e.trace.ambiguityReason, 'tie-best-score');
    }
  });

  // HH-MC02: multi-candidate — mutual best check fails
  // Contract: mutual-best failure must surface remove-add-fallback (diff-only assertion).
  it('HH-MC02: multi-candidate — mutual-best check fails → remove-add-fallback', () => {
    // Two previous Text components A and B, two next Text components.
    // Both A and B score best against the same next candidate (next[0]).
    // next[0]'s reverse best is one of them (say A), leaving B with a failed mutual check.
    // We achieve this by: prev[0] (label:x, extra:1), prev[1] (label:x), next[0] (label:x, extra:1), next[1] (label:y)
    // prev[0] scores higher vs next[0] (2+2=4), prev[1] scores 2 vs next[0]
    // next[0]'s best reverse is prev[0] → mutual match for prev[0]
    // prev[1] is now bestNextByPrevious[1] = next[0] but mutual check fails (next[0] matched prev[0])
    // → prev[1] should be multi-candidate fallback
    const result = diff.createDiffResultSkeleton(
      makePrev([
        { Text: { label: 'x', extra: '1' } },
        { Text: { label: 'x' } }
      ]),
      makeNext([
        { Text: { label: 'x', extra: '1' } },
        { Text: { label: 'y' } }
      ])
    );

    const events = componentEvents(result);
    const multiCandidateEvents = events.filter(
      e => e.trace.ambiguityReason === 'multi-candidate'
    );
    assert.ok(
      multiCandidateEvents.length >= 1,
      `expected at least 1 event with ambiguityReason:'multi-candidate', got ${JSON.stringify(events.map(e => ({ kind: e.kind, pairingReason: e.trace.pairingReason, ambiguityReason: e.trace.ambiguityReason })))}`
    );
    for (const e of multiCandidateEvents) {
      assert.strictEqual(e.trace.fallbackMarker, 'remove-add-fallback');
      assert.strictEqual(e.trace.pairingReason, 'unpaired');
    }
  });

  // HH-MC03: below-threshold — bestScore >= weightScalarExact but below minScore
  // Contract: custom policy thresholds must flip to below-threshold fallback (diff engine only).
  it('HH-MC03: below-threshold — score has scalar signal but below minScore → remove-add-fallback', () => {
    // Use a custom policy with minScore=4 so score=3 (one scalar match + keyset) is below threshold.
    // weightScalarExact=2: one matching scalar gives 2 pts; keyset adds 1 → total 3 < 4 = minScore.
    const policy = {
      minScore: 4,
      weightScalarExact: 2,
      weightChildSignature: 1,
      weightKeysetMatch: 1,
      requireMutualBest: true,
      rejectTie: true,
    };
    const result = diff.createDiffResultSkeleton(
      makePrev([{ Text: { label: 'a' } }]),
      makeNext([{ Text: { label: 'a' } }]),
      policy
    );

    const events = componentEvents(result);
    const belowThresholdEvents = events.filter(
      e => e.trace.ambiguityReason === 'below-threshold'
    );
    assert.ok(
      belowThresholdEvents.length >= 1,
      `expected at least 1 event with ambiguityReason:'below-threshold', got ${JSON.stringify(events.map(e => ({ kind: e.kind, pairingReason: e.trace.pairingReason, fallbackMarker: e.trace.fallbackMarker, ambiguityReason: e.trace.ambiguityReason })))}`
    );
    for (const e of belowThresholdEvents) {
      assert.strictEqual(e.trace.fallbackMarker, 'remove-add-fallback');
      assert.strictEqual(e.trace.pairingReason, 'unpaired');
    }
  });

  // Normal case: unique unambiguous match → heuristic-similarity (not remove-add-fallback)
  // Guardrail: proves fallback markers do not fire on happy-path heuristic pairing.
  it('normal case: unique match above threshold → heuristic-similarity, NOT remove-add-fallback', () => {
    const result = diff.createDiffResultSkeleton(
      makePrev([{ Text: { label: 'unique' } }]),
      makeNext([{ Text: { label: 'unique' } }])
    );

    const events = componentEvents(result);
    const heuristicEvents = events.filter(
      e => e.trace.pairingReason === 'heuristic-similarity'
    );
    assert.ok(heuristicEvents.length >= 1, 'expected heuristic-similarity event for unique match');
    for (const e of heuristicEvents) {
      assert.notStrictEqual(e.trace.fallbackMarker, 'remove-add-fallback');
      assert.strictEqual(e.trace.ambiguityReason, undefined);
    }
  });

  // Ambiguous candidates must not flow to index pairing (no structural-path pairing for ambiguous)
  // Contract: tie-heavy grids must not be mis-labelled as heuristic-similarity (diff-only).
  it('ambiguous candidates do not flow to index-based pairing', () => {
    // Two identical Text components in previous, two identical in next → all tied → all fallback
    const result = diff.createDiffResultSkeleton(
      makePrev([
        { Text: { label: 'same' } },
        { Text: { label: 'same' } }
      ]),
      makeNext([
        { Text: { label: 'same' } },
        { Text: { label: 'same' } }
      ])
    );

    const events = componentEvents(result);
    // None of the component events should use structural-path pairing if they were heuristic candidates
    // The key guarantee: no event has pairingReason:'heuristic-similarity' when tied
    const heuristicEvents = events.filter(
      e => e.trace.pairingReason === 'heuristic-similarity'
    );
    // All Text components were tied — none should be heuristic-similarity
    // (they may be structural-path if they have no heuristic signal, but NOT heuristic when tied)
    for (const e of heuristicEvents) {
      assert.notStrictEqual(
        e.trace.ambiguityReason,
        'tie-best-score',
        'a tie-ambiguous event must not be labelled heuristic-similarity'
      );
    }
  });
});
