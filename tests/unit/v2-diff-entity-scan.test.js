const assert = require('assert');

describe('semantic diff v2 entity scan', () => {
  let structureDiff;
  let entityScan;
  let providerModule;

  before(() => {
    structureDiff = require('../../out/core/diff/structure-diff');
    entityScan = require('../../out/core/diff/v2-diff-entity-scan');
    providerModule = require('../../out/core/diff/v2-semantic-diff-provider');
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

  it('emits entity_state_changed for matched entities whose state changed', () => {
    const previous = makeDoc('previous', {
      id: 'settings',
      title: 'Settings',
      state: { mode: 'draft', flags: ['editable'] },
    });
    const next = makeDoc('next', {
      id: 'settings',
      title: 'Settings',
      state: { mode: 'published', flags: ['editable'] },
    });

    const screens = entityScan.scanEntityDiffs(previous, next);
    const entityDiffs = screens[0].entities;

    assert.strictEqual(entityDiffs.length, 1);
    assert.strictEqual(entityDiffs[0].entity_id, 'settings');
    assert.strictEqual(entityDiffs[0].diffs.length, 1);
    assert.strictEqual(entityDiffs[0].diffs[0].decision.diff_event, 'entity_state_changed');
    assert.strictEqual(entityDiffs[0].diffs[0].decision.target_id, 'settings');
    assert.deepStrictEqual(entityDiffs[0].diffs[0].explanation.before_predicate, { mode: 'draft', flags: ['editable'] });
    assert.deepStrictEqual(entityDiffs[0].diffs[0].explanation.after_predicate, { mode: 'published', flags: ['editable'] });
  });

  it('keeps entity_state_changed low-confidence when the matched entity has a missing id', () => {
    const previous = makeDoc('previous', {
      id: '',
      title: 'Checkout',
      state: { step: 'shipping' },
    });
    const next = makeDoc('next', {
      id: 'checkout',
      title: 'Checkout',
      state: { step: 'payment' },
    });

    const screens = entityScan.scanEntityDiffs(previous, next);
    const decision = screens[0].entities[0].diffs[0].decision;

    assert.strictEqual(decision.diff_event, 'entity_state_changed');
    assert.strictEqual(decision.target_id, 'checkout');
    assert.strictEqual(decision.confidence, 0.7);
    assert.strictEqual(decision.confidence_band, 'low');
    assert.strictEqual(decision.review_status, 'needs_review');
    assert.strictEqual(decision.ambiguity_reason, 'matching title with missing entity id');
  });

  it('propagates entity_state_changed into provider metadata totals', () => {
    const provider = new providerModule.V2SemanticDiffProvider();
    const previous = makeDoc('previous', {
      id: 'profile',
      title: 'Profile',
      state: { stage: 'draft' },
    });
    const next = makeDoc('next', {
      id: 'profile',
      title: 'Profile',
      state: { stage: 'published' },
    });

    const result = provider.compareStructureDiff(previous, next);

    assert.ok(result.v2);
    assert.strictEqual(result.v2.metadata.totalRecords, 1);
    assert.strictEqual(result.v2.screens[0].entities[0].diffs[0].decision.diff_event, 'entity_state_changed');
  });
});
