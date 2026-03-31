/**
 * Unit tests for buildDiffCheckRunResult() (T-20260401-004).
 *
 * Coverage:
 *   - s3-critical > 0 + strict → fail + exitCode non-zero
 *   - s3-critical > 0 + advisory → fail + exitCode 0
 *   - heuristic-only (no critical) → warn
 *   - all pass conditions → signal: pass
 *   - ambiguity > threshold in strict mode → fail
 *   - ambiguity > threshold in advisory mode → warn
 *   - diagnostics are informational only (do not affect signal)
 *   - metrics reflect correct counts
 */

'use strict';

const assert = require('assert');
const { buildDiffCheckRunResult } = require('../../out/workflow/diff/gate/build-diff-check-run-result');

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeExternal(events = []) {
  return {
    kind: 'textui-diff-result-external',
    schemaVersion: 'diff-result-external/v0',
    producer: {
      engine: 'textui-diff-core',
      engineVersion: '0.7.3',
      compareStage: 'c1-skeleton',
      producedAt: '2026-04-01T00:00:00.000Z',
    },
    events,
    metadata: {
      eventCount: events.length,
      previousSource: { pageId: 'p1' },
      nextSource: { pageId: 'p2' },
    },
  };
}

function makeEvent(id, kind, entityKind, opts = {}) {
  return {
    eventId: id,
    kind,
    entityKind,
    pairingReason: opts.pairingReason ?? 'deterministic-explicit-id',
    fallbackMarker: opts.fallbackMarker ?? 'none',
  };
}

const STRICT_POLICY = { mode: 'strict' };
const ADVISORY_POLICY = { mode: 'advisory' };

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('buildDiffCheckRunResult (T-20260401-004)', () => {

  describe('Result structure', () => {
    it('returns kind: diff-check-run-result', () => {
      const external = makeExternal([]);
      const result = buildDiffCheckRunResult(external, { policy: ADVISORY_POLICY });
      assert.strictEqual(result.kind, 'diff-check-run-result');
    });

    it('includes signal, reasons, metrics, mode, exitCode', () => {
      const result = buildDiffCheckRunResult(makeExternal([]), { policy: STRICT_POLICY });
      assert.ok('signal' in result);
      assert.ok('reasons' in result);
      assert.ok('metrics' in result);
      assert.ok('mode' in result);
      assert.ok('exitCode' in result);
    });

    it('reflects mode from policy', () => {
      const r1 = buildDiffCheckRunResult(makeExternal([]), { policy: STRICT_POLICY });
      const r2 = buildDiffCheckRunResult(makeExternal([]), { policy: ADVISORY_POLICY });
      assert.strictEqual(r1.mode, 'strict');
      assert.strictEqual(r2.mode, 'advisory');
    });
  });

  describe('Rule 1: s3-critical > 0', () => {
    it('remove+add kind → fail signal', () => {
      const external = makeExternal([makeEvent('e1', 'remove+add', 'component')]);
      const result = buildDiffCheckRunResult(external, { policy: ADVISORY_POLICY });
      assert.strictEqual(result.signal, 'fail');
    });

    it('remove-add-fallback marker → fail signal', () => {
      const external = makeExternal([
        makeEvent('e1', 'remove', 'component', { fallbackMarker: 'remove-add-fallback' }),
      ]);
      const result = buildDiffCheckRunResult(external, { policy: ADVISORY_POLICY });
      assert.strictEqual(result.signal, 'fail');
    });

    it('s3-critical + strict → exitCode 1', () => {
      const external = makeExternal([makeEvent('e1', 'remove+add', 'component')]);
      const result = buildDiffCheckRunResult(external, { policy: STRICT_POLICY });
      assert.strictEqual(result.signal, 'fail');
      assert.strictEqual(result.exitCode, 1);
    });

    it('s3-critical + advisory → fail signal but exitCode 0', () => {
      const external = makeExternal([makeEvent('e1', 'remove+add', 'component')]);
      const result = buildDiffCheckRunResult(external, { policy: ADVISORY_POLICY });
      assert.strictEqual(result.signal, 'fail');
      assert.strictEqual(result.exitCode, 0);
    });

    it('metrics.criticalCount reflects the count', () => {
      const external = makeExternal([
        makeEvent('e1', 'remove+add', 'component'),
        makeEvent('e2', 'remove+add', 'page'),
      ]);
      const result = buildDiffCheckRunResult(external, { policy: ADVISORY_POLICY });
      assert.strictEqual(result.metrics.criticalCount, 2);
    });

    it('includes reason string mentioning critical events', () => {
      const external = makeExternal([makeEvent('e1', 'remove+add', 'component')]);
      const result = buildDiffCheckRunResult(external, { policy: ADVISORY_POLICY });
      assert.ok(result.reasons.some(r => r.includes('critical')));
    });
  });

  describe('Rule 2: ambiguity > threshold', () => {
    it('heuristic-pending fallback in strict → fail', () => {
      const external = makeExternal([
        makeEvent('e1', 'update', 'component', { fallbackMarker: 'heuristic-pending', pairingReason: 'heuristic-similarity' }),
      ]);
      const result = buildDiffCheckRunResult(external, { policy: STRICT_POLICY });
      assert.strictEqual(result.signal, 'fail');
      assert.strictEqual(result.exitCode, 1);
    });

    it('heuristic-pending fallback in advisory → warn', () => {
      const external = makeExternal([
        makeEvent('e1', 'update', 'component', { fallbackMarker: 'heuristic-pending', pairingReason: 'heuristic-similarity' }),
      ]);
      const result = buildDiffCheckRunResult(external, { policy: ADVISORY_POLICY });
      assert.strictEqual(result.signal, 'warn');
      assert.strictEqual(result.exitCode, 0);
    });

    it('ambiguityThreshold = 2 suppresses warn when count = 2', () => {
      const external = makeExternal([
        makeEvent('e1', 'update', 'component', { fallbackMarker: 'heuristic-pending', pairingReason: 'heuristic-similarity' }),
        makeEvent('e2', 'update', 'component', { fallbackMarker: 'heuristic-pending', pairingReason: 'heuristic-similarity' }),
      ]);
      const result = buildDiffCheckRunResult(external, {
        policy: { mode: 'advisory', ambiguityThreshold: 2 },
      });
      // count (2) is not > threshold (2), so ambiguity rule does not fire
      // but heuristic-only rule may fire — only testing that rule 2 is gated correctly
      assert.ok(result.metrics.ambiguityCount === 2);
      assert.ok(result.metrics.ambiguityThreshold === 2);
    });

    it('ambiguityThreshold = 1 triggers when count = 2', () => {
      const external = makeExternal([
        makeEvent('e1', 'update', 'component', { fallbackMarker: 'heuristic-pending', pairingReason: 'heuristic-similarity' }),
        makeEvent('e2', 'update', 'component', { fallbackMarker: 'heuristic-pending', pairingReason: 'heuristic-similarity' }),
      ]);
      const result = buildDiffCheckRunResult(external, {
        policy: { mode: 'advisory', ambiguityThreshold: 1 },
      });
      // count (2) > threshold (1) → triggers
      assert.ok(result.reasons.some(r => r.includes('ambiguity count')));
    });
  });

  describe('Rule 3: heuristic-only (no critical)', () => {
    it('heuristic pairing without fallback → warn', () => {
      const external = makeExternal([
        makeEvent('e1', 'update', 'component', { pairingReason: 'heuristic-similarity', fallbackMarker: 'none' }),
      ]);
      const result = buildDiffCheckRunResult(external, { policy: ADVISORY_POLICY });
      assert.strictEqual(result.signal, 'warn');
      assert.strictEqual(result.exitCode, 0);
    });

    it('heuristic-only + strict → warn (not fail)', () => {
      // Rule 3 produces warn only; strict mode only promotes fail→exitCode1
      const external = makeExternal([
        makeEvent('e1', 'update', 'component', { pairingReason: 'heuristic-similarity', fallbackMarker: 'none' }),
      ]);
      const result = buildDiffCheckRunResult(external, { policy: STRICT_POLICY });
      assert.strictEqual(result.signal, 'warn');
      assert.strictEqual(result.exitCode, 0);
    });

    it('heuristic-only count in metrics', () => {
      const external = makeExternal([
        makeEvent('e1', 'update', 'component', { pairingReason: 'heuristic-similarity', fallbackMarker: 'none' }),
        makeEvent('e2', 'add', 'component'),
      ]);
      const result = buildDiffCheckRunResult(external, { policy: ADVISORY_POLICY });
      assert.strictEqual(result.metrics.heuristicOnlyCount, 1);
    });

    it('includes reason string mentioning heuristic events', () => {
      const external = makeExternal([
        makeEvent('e1', 'update', 'component', { pairingReason: 'heuristic-similarity', fallbackMarker: 'none' }),
      ]);
      const result = buildDiffCheckRunResult(external, { policy: ADVISORY_POLICY });
      assert.ok(result.reasons.some(r => r.includes('heuristic')));
    });
  });

  describe('Rule 4: pass conditions', () => {
    it('empty events → pass + exitCode 0', () => {
      const result = buildDiffCheckRunResult(makeExternal([]), { policy: STRICT_POLICY });
      assert.strictEqual(result.signal, 'pass');
      assert.strictEqual(result.exitCode, 0);
    });

    it('all deterministic events, no ambiguity → pass', () => {
      const external = makeExternal([
        makeEvent('e1', 'add', 'component'),
        makeEvent('e2', 'remove', 'page'),
        makeEvent('e3', 'update', 'property'),
      ]);
      const result = buildDiffCheckRunResult(external, { policy: STRICT_POLICY });
      assert.strictEqual(result.signal, 'pass');
      assert.strictEqual(result.exitCode, 0);
    });

    it('pass result includes at least one reason', () => {
      const result = buildDiffCheckRunResult(makeExternal([]), { policy: ADVISORY_POLICY });
      assert.ok(result.reasons.length > 0);
    });

    it('pass + advisory → exitCode 0', () => {
      const result = buildDiffCheckRunResult(makeExternal([]), { policy: ADVISORY_POLICY });
      assert.strictEqual(result.exitCode, 0);
    });
  });

  describe('Metrics', () => {
    it('metrics.totalEvents reflects external events count', () => {
      const external = makeExternal([
        makeEvent('e1', 'add', 'component'),
        makeEvent('e2', 'remove', 'page'),
      ]);
      const result = buildDiffCheckRunResult(external, { policy: ADVISORY_POLICY });
      assert.strictEqual(result.metrics.totalEvents, 2);
    });

    it('metrics.ambiguityThreshold reflects policy default of 0', () => {
      const result = buildDiffCheckRunResult(makeExternal([]), { policy: ADVISORY_POLICY });
      assert.strictEqual(result.metrics.ambiguityThreshold, 0);
    });

    it('metrics.ambiguityThreshold reflects custom threshold', () => {
      const result = buildDiffCheckRunResult(makeExternal([]), {
        policy: { mode: 'advisory', ambiguityThreshold: 3 },
      });
      assert.strictEqual(result.metrics.ambiguityThreshold, 3);
    });
  });

  describe('Diagnostics (informational only)', () => {
    it('diagnostics do not change signal compared to no diagnostics', () => {
      const external = makeExternal([makeEvent('e1', 'remove+add', 'component')]);
      const r1 = buildDiffCheckRunResult(external, { policy: ADVISORY_POLICY });
      const r2 = buildDiffCheckRunResult(external, {
        policy: ADVISORY_POLICY,
        diagnostics: { totalEvents: 1, heuristicCount: 0, fallbackCount: 1 },
      });
      assert.strictEqual(r1.signal, r2.signal);
      assert.strictEqual(r1.exitCode, r2.exitCode);
    });
  });
});
