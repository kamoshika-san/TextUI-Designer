'use strict';

const assert = require('assert');

describe('heuristic trace output (M2-1)', () => {
  let diff;
  let diagnostics;

  before(() => {
    diff = require('../../out/core/textui-core-diff');
    diagnostics = require('../../out/core/textui-diff-diagnostics');
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

  it('emits heuristicTrace for accepted heuristic matches with score components', () => {
    const result = diff.createDiffResultSkeleton(
      makePrev([{ Text: { label: 'hello' } }]),
      makeNext([{ Text: { label: 'hello' } }])
    );

    const heuristicEvent = componentEvents(result).find(
      e => e.trace.pairingReason === 'heuristic-similarity'
    );
    assert.ok(heuristicEvent, 'expected a heuristic-similarity component event');
    assert.ok(heuristicEvent.trace.heuristicTrace, 'accepted heuristic event should carry heuristicTrace');
    assert.strictEqual(heuristicEvent.trace.heuristicTrace.attempted, true);
    assert.strictEqual(heuristicEvent.trace.heuristicTrace.accepted, true);
    assert.ok(heuristicEvent.trace.heuristicTrace.totalScore >= heuristicEvent.trace.heuristicTrace.minScore);
    assert.ok(heuristicEvent.trace.heuristicTrace.components.scalarExact > 0);
    assert.ok(typeof heuristicEvent.trace.heuristicTrace.policyHash === 'string');

    const diag = diagnostics.buildDiffDiagnostics(result);
    const trace = diag.traces.find(t => t.eventId === heuristicEvent.eventId);
    assert.ok(trace && trace.heuristicTrace, 'diagnostics trace should preserve heuristicTrace');
    assert.strictEqual(trace.heuristicTrace.accepted, true);
  });

  it('emits heuristicTrace forbidden-zone rejection for blocked heuristic candidates', () => {
    const result = diff.createDiffResultSkeleton(
      makePrev([
        {
          Form: {
            fields: [{ Button: { label: 'save' } }],
            actions: []
          }
        }
      ]),
      makeNext([
        {
          Form: {
            fields: [],
            actions: [{ Button: { label: 'save' } }]
          }
        }
      ])
    );

    const forbiddenZoneEvent = componentEvents(result).find(
      e => e.trace.heuristicTrace && e.trace.heuristicTrace.rejectedBy === 'forbidden-zone'
    );
    assert.ok(forbiddenZoneEvent, 'expected a forbidden-zone heuristic rejection event');
    assert.strictEqual(forbiddenZoneEvent.trace.pairingReason, 'unpaired');
    assert.strictEqual(forbiddenZoneEvent.trace.fallbackMarker, 'remove-add-fallback');
    assert.strictEqual(forbiddenZoneEvent.trace.heuristicTrace.accepted, false);
  });

  it('emits heuristicTrace tie rejection for ambiguity fallback', () => {
    const result = diff.createDiffResultSkeleton(
      makePrev([{ Text: { label: 'hello' } }]),
      makeNext([
        { Text: { label: 'hello' } },
        { Text: { label: 'hello' } }
      ])
    );

    const tieEvent = componentEvents(result).find(
      e => e.trace.heuristicTrace && e.trace.heuristicTrace.rejectedBy === 'tie'
    );
    assert.ok(tieEvent, 'expected a tie-rejected heuristic fallback event');
    assert.strictEqual(tieEvent.trace.heuristicTrace.ambiguityReason, 'tie-best-score');
    assert.strictEqual(tieEvent.trace.heuristicTrace.accepted, false);
  });

  it('does not emit heuristicTrace for deterministic pairing', () => {
    const result = diff.createDiffResultSkeleton(
      makePrev([{ Text: { id: 'stable', label: 'hello' } }]),
      makeNext([{ Text: { id: 'stable', label: 'hello again' } }])
    );

    const deterministicEvent = componentEvents(result).find(
      e => e.trace.pairingReason === 'deterministic-explicit-id'
    );
    assert.ok(deterministicEvent, 'expected a deterministic-explicit-id component event');
    assert.strictEqual(deterministicEvent.trace.heuristicTrace, undefined);
  });
});
