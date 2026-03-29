/**
 * C3-3: diff core golden regression baseline
 *
 * Contract-level assertions on DiffEventKind, pairingReason, fallbackMarker,
 * and identitySource.  These tests verify the observable contract of
 * createDiffResultSkeleton — not internal indices or traversal order.
 *
 * Coverage:
 *   positive cases  — add, remove, update (all 3 deterministic paths), rename,
 *                     reorder, move, remove+add, heuristic-similarity
 *   negative baseline — identical DSL produces no structural change events
 *   diagnostics surface — buildDiffDiagnostics projection over compare result
 *
 * Connects Epic B golden cases to diff core regression (T-155).
 * Designed to be J2-snapshot-compatible: assertions use assert.strictEqual and
 * assert.deepStrictEqual on stable contract fields only.
 */

const assert = require('assert');

describe('textui-diff-core golden regression (C3-3)', () => {
  let diff;

  before(() => {
    diff = require('../../out/core/textui-core-diff');
  });

  // -- helpers ----------------------------------------------------------------

  function makePrev(components, opts = {}) {
    return diff.createNormalizedDiffDocument(
      { page: { id: opts.id || 'page-p', title: 'Prev', layout: 'vertical', components } },
      { side: 'previous' }
    );
  }

  function makeNext(components, opts = {}) {
    return diff.createNormalizedDiffDocument(
      { page: { id: opts.id || 'page-p', title: 'Next', layout: 'vertical', components } },
      { side: 'next' }
    );
  }

  function componentEvents(result) {
    return result.events.filter(e => e.entityKind === 'component');
  }

  function findComponentEvent(result, kind) {
    return componentEvents(result).find(e => e.kind === kind);
  }

  function findComponentEvents(result, kind) {
    return componentEvents(result).filter(e => e.kind === kind);
  }

  // -- positive cases ---------------------------------------------------------

  it('add — component present in next only → kind:add, no fallback', () => {
    const result = diff.createDiffResultSkeleton(
      makePrev([]),
      makeNext([{ Button: { label: 'Save' } }])
    );
    const ev = findComponentEvent(result, 'add');
    assert.ok(ev, 'expected component add event');
    assert.strictEqual(ev.kind, 'add');
    assert.strictEqual(ev.trace.fallbackMarker, 'none');
  });

  it('remove — component present in previous only → kind:remove, no fallback', () => {
    const result = diff.createDiffResultSkeleton(
      makePrev([{ Button: { label: 'Save' } }]),
      makeNext([])
    );
    const ev = findComponentEvent(result, 'remove');
    assert.ok(ev, 'expected component remove event');
    assert.strictEqual(ev.kind, 'remove');
    assert.strictEqual(ev.trace.fallbackMarker, 'none');
  });

  it('update deterministic-structural-path — same kind at same position, scalar changed', () => {
    const result = diff.createDiffResultSkeleton(
      makePrev([{ Button: { label: 'Old' } }]),
      makeNext([{ Button: { label: 'New' } }])
    );
    const ev = findComponentEvent(result, 'update');
    assert.ok(ev, 'expected component update event');
    assert.strictEqual(ev.trace.pairingReason, 'deterministic-structural-path');
    assert.strictEqual(ev.trace.fallbackMarker, 'none');
  });

  it('update deterministic-explicit-id — same id field, label changed', () => {
    const result = diff.createDiffResultSkeleton(
      makePrev([{ Button: { id: 'btn-save', label: 'Old' } }]),
      makeNext([{ Button: { id: 'btn-save', label: 'New' } }])
    );
    const ev = findComponentEvent(result, 'update');
    assert.ok(ev, 'expected component update event');
    assert.strictEqual(ev.trace.identitySource, 'explicit-id');
    assert.strictEqual(ev.trace.pairingReason, 'deterministic-explicit-id');
    assert.strictEqual(ev.trace.fallbackMarker, 'none');
  });

  it('update deterministic-fallback-key — same name field, no id', () => {
    const result = diff.createDiffResultSkeleton(
      makePrev([{ Input: { name: 'email', label: 'Old Label' } }]),
      makeNext([{ Input: { name: 'email', label: 'New Label' } }])
    );
    const ev = findComponentEvent(result, 'update');
    assert.ok(ev, 'expected component update event');
    assert.strictEqual(ev.trace.identitySource, 'fallback-key');
    assert.strictEqual(ev.trace.pairingReason, 'deterministic-fallback-key');
    assert.strictEqual(ev.trace.fallbackMarker, 'none');
  });

  it('rename — explicit-id paired, name (fallback-key) changed', () => {
    const result = diff.createDiffResultSkeleton(
      makePrev([{ Input: { id: 'fld-1', name: 'username', label: 'Username' } }]),
      makeNext([{ Input: { id: 'fld-1', name: 'email', label: 'Email' } }])
    );
    const ev = findComponentEvent(result, 'rename');
    assert.ok(ev, 'expected rename event');
    assert.strictEqual(ev.trace.identitySource, 'explicit-id');
    assert.strictEqual(ev.trace.pairingReason, 'deterministic-explicit-id');
    assert.strictEqual(ev.trace.fallbackMarker, 'none');
  });

  it('reorder — explicit-id, two components swapped positions', () => {
    const result = diff.createDiffResultSkeleton(
      makePrev([
        { Button: { id: 'btn-a', label: 'A' } },
        { Button: { id: 'btn-b', label: 'B' } }
      ]),
      makeNext([
        { Button: { id: 'btn-b', label: 'B' } },
        { Button: { id: 'btn-a', label: 'A' } }
      ])
    );
    const reorders = findComponentEvents(result, 'reorder');
    assert.ok(reorders.length >= 1, 'expected at least one reorder event');
    for (const ev of reorders) {
      assert.strictEqual(ev.trace.identitySource, 'explicit-id');
      assert.strictEqual(ev.trace.pairingReason, 'deterministic-explicit-id');
    }
  });

  it('remove+add — kind mismatch at same position → remove-add-fallback', () => {
    const result = diff.createDiffResultSkeleton(
      makePrev([{ Button: { label: 'Go' } }]),
      makeNext([{ Input: { name: 'query', label: 'Search' } }])
    );
    const ev = findComponentEvent(result, 'remove+add');
    assert.ok(ev, 'expected remove+add event');
    assert.strictEqual(ev.trace.fallbackMarker, 'remove-add-fallback');
  });

  it('heuristic-similarity — no identity fields, matching scalars → heuristic-pending, high confidence', () => {
    // Two Text components with identical scalars at swapped positions.
    // Neither has id or name, so deterministic anchor is absent.
    // Heuristic scoring matches them by (value, variant) similarity.
    const result = diff.createDiffResultSkeleton(
      makePrev([
        { Text: { value: 'Hello World', variant: 'h1' } },
        { Text: { value: 'Body text content here', variant: 'p' } }
      ]),
      makeNext([
        { Text: { value: 'Body text content here', variant: 'p' } },
        { Text: { value: 'Hello World', variant: 'h1' } }
      ])
    );
    const heuristic = componentEvents(result).filter(
      e => e.trace.pairingReason === 'heuristic-similarity'
    );
    assert.ok(heuristic.length >= 1, 'expected at least one heuristic-similarity component event');
    for (const ev of heuristic) {
      assert.strictEqual(ev.trace.fallbackMarker, 'heuristic-pending');
      assert.strictEqual(ev.trace.fallbackConfidence, 'high');
    }
  });

  // -- negative baseline ------------------------------------------------------

  it('negative baseline — identical DSL with id fields → no structural change events, no fallbacks', () => {
    const components = [
      { Button: { id: 'btn-ok', label: 'OK' } },
      { Input: { name: 'search', label: 'Search', type: 'text' } }
    ];
    const result = diff.createDiffResultSkeleton(makePrev(components), makeNext(components));
    const structural = componentEvents(result).filter(e =>
      e.kind === 'add' || e.kind === 'remove' || e.kind === 'rename' ||
      e.kind === 'reorder' || e.kind === 'move' || e.kind === 'remove+add'
    );
    assert.deepStrictEqual(structural, [], 'identical DSL must produce no structural change events');
    const fallbacks = result.events.filter(e => e.trace.fallbackMarker !== 'none');
    assert.deepStrictEqual(fallbacks, [], 'identical DSL must produce no fallback markers');
  });

  // -- diagnostics surface integration ----------------------------------------

  it('diagnostics — buildDiffDiagnostics produces one trace per event with valid pairingClass', () => {
    const diagnostics = require('../../out/core/textui-diff-diagnostics');
    const result = diff.createDiffResultSkeleton(
      makePrev([
        { Button: { id: 'btn-1', label: 'First' } },
        { Text: { value: 'no-id text', variant: 'p' } }
      ]),
      makeNext([
        { Button: { id: 'btn-1', label: 'Second' } },
        { Text: { value: 'no-id text', variant: 'p' } }
      ])
    );
    const diag = diagnostics.buildDiffDiagnostics(result);
    assert.strictEqual(diag.kind, 'diff-diagnostics-result');
    assert.strictEqual(diag.summary.totalEvents, result.events.length);
    assert.strictEqual(diag.traces.length, result.events.length);
    assert.ok(diag.summary.deterministicCount > 0, 'expected deterministic events');
    assert.strictEqual(
      diag.summary.deterministicCount + diag.summary.heuristicCount + diag.summary.unpairedCount,
      diag.summary.totalEvents,
      'pairingClass counts must sum to totalEvents'
    );
    for (const trace of diag.traces) {
      assert.ok(
        trace.pairingClass === 'deterministic' ||
        trace.pairingClass === 'heuristic' ||
        trace.pairingClass === 'unpaired',
        `unexpected pairingClass: ${trace.pairingClass}`
      );
      assert.ok(
        typeof trace.reasonSummary === 'string' && trace.reasonSummary.length > 0,
        'reasonSummary must be non-empty string'
      );
    }
  });

  it('diagnostics — fallbackCount matches events with hasFallback:true', () => {
    const diagnostics = require('../../out/core/textui-diff-diagnostics');
    // remove+add produces fallbackMarker:'remove-add-fallback', heuristic produces 'heuristic-pending'
    const result = diff.createDiffResultSkeleton(
      makePrev([
        { Button: { label: 'Go' } },
        { Text: { value: 'A', variant: 'h1' } },
        { Text: { value: 'B long body text', variant: 'p' } }
      ]),
      makeNext([
        { Input: { name: 'q', label: 'Search' } },   // remove+add (kind mismatch)
        { Text: { value: 'B long body text', variant: 'p' } },
        { Text: { value: 'A', variant: 'h1' } }
      ])
    );
    const diag = diagnostics.buildDiffDiagnostics(result);
    const manualFallbackCount = diag.traces.filter(t => t.hasFallback).length;
    assert.strictEqual(diag.summary.fallbackCount, manualFallbackCount);
    assert.ok(diag.summary.fallbackCount > 0, 'expected at least one fallback in this fixture');
  });
});
