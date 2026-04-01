/**
 * HH-FZ series: forbidden-zone hard filter tests (T-20260401-501 / M1-2)
 *
 * Tests for isHeuristicAllowed() — the guard that hard-rejects candidate pairs
 * that cross parent boundaries, owner scopes, or semantic collection slots
 * before any similarity score is computed.
 */
'use strict';
const assert = require('assert');

describe('heuristic forbidden-zone filter (HH-FZ series)', () => {
  let diff;

  before(() => {
    diff = require('../../out/core/textui-core-diff');
  });

  function makeCandidate(path, collectionKey, opts = {}) {
    return {
      item: opts.item ?? { Button: { label: 'ok' } },
      path,
      index: opts.index ?? 0,
      collectionKey,
      ownerScope: opts.ownerScope,
    };
  }

  // HH-FZ01: cross-parent → reject
  it('HH-FZ01: cross-parent — different parent collection paths → reject', () => {
    const a = makeCandidate('/page/components/0/children/0', 'children');
    const b = makeCandidate('/page/components/1/children/0', 'children');
    assert.strictEqual(diff.isHeuristicAllowed(a, b), false);
  });

  // HH-FZ02: cross-owner → reject
  it('HH-FZ02: cross-owner — different ownerScope → reject', () => {
    const a = makeCandidate('/page/components/0', 'components', { ownerScope: 'form-a' });
    const b = makeCandidate('/page/components/1', 'components', { ownerScope: 'form-b' });
    assert.strictEqual(diff.isHeuristicAllowed(a, b), false);
  });

  // HH-FZ03: cross-semantic-slot → reject
  it('HH-FZ03: cross-semantic-slot — different collectionKey → reject', () => {
    const a = makeCandidate('/page/components/0/fields/0', 'fields');
    const b = makeCandidate('/page/components/0/actions/0', 'actions');
    assert.strictEqual(diff.isHeuristicAllowed(a, b), false);
  });

  // HH-FZ04: same parent / same owner / same slot → pass
  it('HH-FZ04: same-parent / same-owner / same-slot → allowed (proceeds to scoring)', () => {
    const a = makeCandidate('/page/components/0', 'components', { ownerScope: 'section-a' });
    const b = makeCandidate('/page/components/1', 'components', { ownerScope: 'section-a' });
    assert.strictEqual(diff.isHeuristicAllowed(a, b), true);
  });

  // HH-FZ05: parentPath prefix match but different tree → reject
  it('HH-FZ05: parentPath prefix match but different subtree → reject', () => {
    // /page/components/0/children vs /page/components/00/children share prefix but differ
    const a = makeCandidate('/page/components/0/children/0', 'children');
    const b = makeCandidate('/page/components/00/children/0', 'children');
    assert.strictEqual(diff.isHeuristicAllowed(a, b), false);
  });

  // HH-FZ06: ownerScope undefined on both → pass (nullish == nullish treated as same)
  it('HH-FZ06: both ownerScope undefined → allowed (nullish same-as-nullish)', () => {
    const a = makeCandidate('/page/components/0', 'components'); // ownerScope undefined
    const b = makeCandidate('/page/components/1', 'components'); // ownerScope undefined
    assert.strictEqual(diff.isHeuristicAllowed(a, b), true);
  });

  // Integration smoke: forbidden-zone candidates are NOT matched in createDiffResultSkeleton
  it('integration: cross-semantic-slot items in same parent are never heuristic-matched', () => {
    // A component with both fields[0] and actions[0]. In previous: matching scalar content.
    // After forbidden-zone filter, fields item must not match actions item.
    const prevDsl = {
      page: {
        id: 'p', title: 'T', layout: 'vertical',
        components: [
          {
            Form: {
              fields: [{ Input: { label: 'name' } }],
              actions: [{ Button: { label: 'name' } }] // same label as field — would score high
            }
          }
        ]
      }
    };
    const nextDsl = {
      page: {
        id: 'p', title: 'T', layout: 'vertical',
        components: [
          {
            Form: {
              fields: [],
              actions: [{ Button: { label: 'name' } }]
            }
          }
        ]
      }
    };
    const prev = diff.createNormalizedDiffDocument(prevDsl, { side: 'previous' });
    const next = diff.createNormalizedDiffDocument(nextDsl, { side: 'next' });
    const result = diff.createDiffResultSkeleton(prev, next);
    // The Input (fields[0] in previous) should become a remove or remove+add, NOT heuristic-similarity
    const heuristicEvents = result.events.filter(
      e => e.entityKind === 'component' && e.trace.pairingReason === 'heuristic-similarity'
    );
    // Fields item cannot have been matched with the actions item
    assert.ok(
      heuristicEvents.every(e => !e.trace.fallbackMarker || e.trace.fallbackMarker !== 'remove-add-fallback'),
      'cross-semantic-slot pair must not produce a heuristic-similarity event'
    );
  });
});
