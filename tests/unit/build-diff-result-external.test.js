/**
 * Unit tests for buildDiffResultExternal() (T-20260401-001).
 *
 * Coverage:
 *   - Minimal DiffCompareResult → DiffResultExternal projection
 *   - events[] contains only contract-safe fields
 *   - Event order is preserved from input
 *   - Same input → same output (deterministic, modulo producedAt)
 *   - previousPath / nextPath are set from trace source refs
 */

'use strict';

const assert = require('assert');
const { buildDiffResultExternal } = require('../../out/workflow/diff/external/build-diff-result-external');

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/**
 * Build a minimal DiffCompareResult for testing.
 * events is an array of partial DiffEvent shapes.
 */
function makeInput(events = []) {
  return {
    kind: 'textui-diff-result',
    input: {
      previous: {
        side: 'previous',
        normalizedDsl: { page: { id: 'p1', title: 'Prev', components: [] } },
        page: { id: 'p1', title: 'Prev', layout: 'page', componentCount: 0 },
        metadata: {
          normalizationState: 'normalized-dsl',
          sourceRefPolicy: 'preserved',
          explicitnessPolicy: 'preserved',
          ownershipPolicy: 'preserved'
        }
      },
      next: {
        side: 'next',
        normalizedDsl: { page: { id: 'p2', title: 'Next', components: [] } },
        page: { id: 'p2', title: 'Next', layout: 'page', componentCount: 0 },
        metadata: {
          normalizationState: 'normalized-dsl',
          sourceRefPolicy: 'preserved',
          explicitnessPolicy: 'preserved',
          ownershipPolicy: 'preserved'
        }
      }
    },
    entityResults: [],
    events,
    metadata: {
      schemaVersion: 'diff-result/v0',
      compareStage: 'c1-skeleton',
      eventCount: events.length,
      entityCount: 0,
      traversal: 'pending',
      classification: 'pending',
      supportedEventKinds: ['add', 'remove', 'update']
    }
  };
}

function makeEvent(id, kind, entityKind, opts = {}) {
  return {
    eventId: id,
    kind,
    entityKey: `key-${id}`,
    entityKind,
    status: 'pending',
    trace: {
      previousSourceRef: opts.prevPath ? { side: 'previous', entityPath: opts.prevPath } : undefined,
      nextSourceRef: opts.nextPath ? { side: 'next', entityPath: opts.nextPath } : undefined,
      explicitness: 'preserved',
      identitySource: 'explicit-id',
      fallbackMarker: opts.fallbackMarker ?? 'none',
      fallbackConfidence: 'not-applicable',
      pairingReason: opts.pairingReason ?? 'deterministic-explicit-id'
    }
  };
}

const DEFAULT_OPTS = {
  previousSource: { pageId: 'p1', sourcePath: 'prev.yaml' },
  nextSource: { pageId: 'p2', sourcePath: 'next.yaml' },
  producer: {
    engine: 'textui-diff-core',
    engineVersion: '0.7.3',
    compareStage: 'c1-skeleton'
  }
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('buildDiffResultExternal (T-20260401-001)', () => {

  describe('Root structure', () => {
    it('sets kind to textui-diff-result-external', () => {
      const result = buildDiffResultExternal(makeInput(), DEFAULT_OPTS);
      assert.strictEqual(result.kind, 'textui-diff-result-external');
    });

    it('sets schemaVersion to diff-result-external/v0', () => {
      const result = buildDiffResultExternal(makeInput(), DEFAULT_OPTS);
      assert.strictEqual(result.schemaVersion, 'diff-result-external/v0');
    });

    it('sets producer fields from opts', () => {
      const result = buildDiffResultExternal(makeInput(), DEFAULT_OPTS);
      assert.strictEqual(result.producer.engine, 'textui-diff-core');
      assert.strictEqual(result.producer.engineVersion, '0.7.3');
      assert.strictEqual(result.producer.compareStage, 'c1-skeleton');
    });

    it('sets producedAt to a valid ISO timestamp when not provided', () => {
      const before = new Date();
      const result = buildDiffResultExternal(makeInput(), DEFAULT_OPTS);
      const after = new Date();
      const ts = new Date(result.producer.producedAt);
      assert.ok(ts >= before && ts <= after, 'producedAt should be close to call time');
    });

    it('uses provided producedAt when given', () => {
      const opts = { ...DEFAULT_OPTS, producer: { ...DEFAULT_OPTS.producer, producedAt: '2026-04-01T00:00:00.000Z' } };
      const result = buildDiffResultExternal(makeInput(), opts);
      assert.strictEqual(result.producer.producedAt, '2026-04-01T00:00:00.000Z');
    });

    it('sets metadata.previousSource and nextSource from opts', () => {
      const result = buildDiffResultExternal(makeInput(), DEFAULT_OPTS);
      assert.deepStrictEqual(result.metadata.previousSource, DEFAULT_OPTS.previousSource);
      assert.deepStrictEqual(result.metadata.nextSource, DEFAULT_OPTS.nextSource);
    });

    it('sets metadata.eventCount to match events array length', () => {
      const input = makeInput([
        makeEvent('e1', 'add', 'component'),
        makeEvent('e2', 'remove', 'component')
      ]);
      const result = buildDiffResultExternal(input, DEFAULT_OPTS);
      assert.strictEqual(result.metadata.eventCount, 2);
      assert.strictEqual(result.events.length, 2);
    });

    it('ignores optional internal v2 payload when projecting external contract', () => {
      const input = makeInput([makeEvent('e1', 'update', 'component')]);
      input.v2 = {
        screens: [{
          screen_id: 'screen:orders.edit',
          diffs: [{
            decision: {
              diff_event: 'component_action_changed',
              target_id: 'component:save',
              confidence: 1,
              review_status: 'approved'
            },
            explanation: {
              evidence: []
            }
          }],
          entities: []
        }],
        metadata: {
          schemaVersion: 'v2-compare-logic/v0',
          totalRecords: 1
        }
      };

      const result = buildDiffResultExternal(input, DEFAULT_OPTS);
      assert.ok(!('v2' in result), 'external projection must not expose internal v2 payload');
      assert.strictEqual(result.events.length, 1);
      assert.strictEqual(result.events[0].eventId, 'e1');
    });
  });

  describe('Minimal conversion — empty events', () => {
    it('produces empty events array for empty input', () => {
      const result = buildDiffResultExternal(makeInput([]), DEFAULT_OPTS);
      assert.deepStrictEqual(result.events, []);
      assert.strictEqual(result.metadata.eventCount, 0);
    });
  });

  describe('Contract-safe fields only in events[]', () => {
    it('includes only contract-safe fields in each event', () => {
      const input = makeInput([makeEvent('e1', 'update', 'property', {
        pairingReason: 'heuristic-similarity',
        fallbackMarker: 'heuristic-pending',
        prevPath: 'page.components[0].label',
        nextPath: 'page.components[0].label'
      })]);
      const result = buildDiffResultExternal(input, DEFAULT_OPTS);
      const ev = result.events[0];

      // Contract-safe fields present
      assert.ok('eventId' in ev, 'eventId should be present');
      assert.ok('kind' in ev, 'kind should be present');
      assert.ok('entityKind' in ev, 'entityKind should be present');
      assert.ok('pairingReason' in ev, 'pairingReason should be present');
      assert.ok('fallbackMarker' in ev, 'fallbackMarker should be present');

      // Internal fields NOT present
      assert.ok(!('entityKey' in ev), 'entityKey must not leak into external event');
      assert.ok(!('status' in ev), 'status must not leak into external event');
      assert.ok(!('trace' in ev), 'trace must not leak into external event');
      assert.ok(!('explicitness' in ev), 'explicitness must not leak');
      assert.ok(!('identitySource' in ev), 'identitySource must not leak');
      assert.ok(!('fallbackConfidence' in ev), 'fallbackConfidence must not leak');
    });

    it('maps pairingReason from trace', () => {
      const input = makeInput([makeEvent('e1', 'update', 'component', {
        pairingReason: 'deterministic-fallback-key'
      })]);
      const result = buildDiffResultExternal(input, DEFAULT_OPTS);
      assert.strictEqual(result.events[0].pairingReason, 'deterministic-fallback-key');
    });

    it('maps fallbackMarker from trace', () => {
      const input = makeInput([makeEvent('e1', 'remove+add', 'component', {
        fallbackMarker: 'remove-add-fallback'
      })]);
      const result = buildDiffResultExternal(input, DEFAULT_OPTS);
      assert.strictEqual(result.events[0].fallbackMarker, 'remove-add-fallback');
    });

    it('preserves flow and transition entity kinds for external consumers', () => {
      const input = makeInput([
        makeEvent('e1', 'update', 'flow'),
        makeEvent('e2', 'add', 'transition')
      ]);
      const result = buildDiffResultExternal(input, DEFAULT_OPTS);
      assert.deepStrictEqual(result.events.map(event => event.entityKind), ['flow', 'transition']);
    });
  });

  describe('previousPath / nextPath', () => {
    it('sets previousPath when trace.previousSourceRef is present', () => {
      const input = makeInput([makeEvent('e1', 'update', 'property', {
        prevPath: 'page.components[1].text'
      })]);
      const result = buildDiffResultExternal(input, DEFAULT_OPTS);
      assert.strictEqual(result.events[0].previousPath, 'page.components[1].text');
    });

    it('sets nextPath when trace.nextSourceRef is present', () => {
      const input = makeInput([makeEvent('e1', 'update', 'property', {
        nextPath: 'page.components[1].text'
      })]);
      const result = buildDiffResultExternal(input, DEFAULT_OPTS);
      assert.strictEqual(result.events[0].nextPath, 'page.components[1].text');
    });

    it('omits previousPath for add events (no previousSourceRef)', () => {
      const input = makeInput([makeEvent('e1', 'add', 'component', {
        nextPath: 'page.components[2]'
      })]);
      const result = buildDiffResultExternal(input, DEFAULT_OPTS);
      assert.ok(!('previousPath' in result.events[0]), 'previousPath must be absent for add events');
      assert.strictEqual(result.events[0].nextPath, 'page.components[2]');
    });

    it('omits nextPath for remove events (no nextSourceRef)', () => {
      const input = makeInput([makeEvent('e1', 'remove', 'component', {
        prevPath: 'page.components[0]'
      })]);
      const result = buildDiffResultExternal(input, DEFAULT_OPTS);
      assert.ok(!('nextPath' in result.events[0]), 'nextPath must be absent for remove events');
      assert.strictEqual(result.events[0].previousPath, 'page.components[0]');
    });
  });

  describe('Event order preservation', () => {
    it('preserves input event order in output events[]', () => {
      const inputEvents = [
        makeEvent('e1', 'add', 'component'),
        makeEvent('e2', 'remove', 'component'),
        makeEvent('e3', 'update', 'property'),
        makeEvent('e4', 'reorder', 'component')
      ];
      const input = makeInput(inputEvents);
      const result = buildDiffResultExternal(input, DEFAULT_OPTS);
      const outputIds = result.events.map(e => e.eventId);
      assert.deepStrictEqual(outputIds, ['e1', 'e2', 'e3', 'e4']);
    });
  });

  describe('Determinism (same input → same output, modulo timestamp)', () => {
    it('produces identical events for identical inputs when producedAt is fixed', () => {
      const inputEvents = [
        makeEvent('e1', 'add', 'page', { nextPath: 'page' }),
        makeEvent('e2', 'update', 'component', { prevPath: 'page.components[0]', nextPath: 'page.components[0]' })
      ];
      const input = makeInput(inputEvents);
      const opts = { ...DEFAULT_OPTS, producer: { ...DEFAULT_OPTS.producer, producedAt: '2026-04-01T12:00:00.000Z' } };

      const r1 = buildDiffResultExternal(input, opts);
      const r2 = buildDiffResultExternal(input, opts);

      assert.deepStrictEqual(r1.events, r2.events);
      assert.deepStrictEqual(r1.metadata, r2.metadata);
      assert.deepStrictEqual(r1.producer, r2.producer);
    });
  });
});
