const assert = require('assert');

describe('semantic diff v2 entity scan', () => {
  let structureDiff;
  let entityScan;

  before(() => {
    structureDiff = require('../../out/core/diff/structure-diff');
    entityScan = require('../../out/core/diff/v2-diff-entity-scan');
  });

  function makeDoc(side, page) {
    return structureDiff.createNormalizedDiffDocument(
      { page: { layout: 'vertical', components: [], ...page } },
      { side }
    );
  }

  it('keeps B-2 rename-like mismatch as low-confidence remove/add', () => {
    const previous = makeDoc('previous', { id: 'page-a', title: 'Settings' });
    const next = makeDoc('next', { id: 'page-b', title: 'Settings' });

    const screens = entityScan.scanEntityDiffs(previous, next);
    const diffs = screens[0].diffs;

    assert.strictEqual(diffs.length, 2);
    assert.strictEqual(diffs[0].decision.diff_event, 'entity_removed');
    assert.strictEqual(diffs[0].decision.confidence_band, 'low');
    assert.strictEqual(diffs[0].decision.confidence, 0.5);
    assert.strictEqual(diffs[0].decision.review_status, 'needs_review');
    assert.strictEqual(diffs[0].decision.ambiguity_reason, 'same title, different id');
    assert.strictEqual(diffs[1].decision.diff_event, 'entity_added');
    assert.strictEqual(diffs[1].decision.confidence, 0.5);
  });

  it('matches same-title entities with a missing id as B-4 confidence 0.7', () => {
    const previous = makeDoc('previous', { id: '', title: 'Checkout' });
    const next = makeDoc('next', { id: 'checkout', title: 'Checkout' });

    const pair = entityScan.pairEntityIdentityV2(previous, next);
    const screens = entityScan.scanEntityDiffs(previous, next);

    assert.strictEqual(pair.kind, 'matched');
    assert.strictEqual(pair.entityId, 'checkout');
    assert.strictEqual(pair.confidence, 0.7);
    assert.strictEqual(pair.ambiguityReason, 'matching title with missing entity id');
    assert.deepStrictEqual(screens[0].diffs, []);
    assert.strictEqual(screens[0].screen_id, 'checkout');
  });
});
