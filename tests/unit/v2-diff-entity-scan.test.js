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
    assert.deepStrictEqual(entityDiffs[0].diffs[0].explanation.before_predicate, {
      fact: 'entity_state',
      op: 'eq',
      value: { mode: 'draft', flags: ['editable'] },
    });
    assert.deepStrictEqual(entityDiffs[0].diffs[0].explanation.after_predicate, {
      fact: 'entity_state',
      op: 'eq',
      value: { mode: 'published', flags: ['editable'] },
    });
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

  it('uses empty evidence for entity_state_changed with predicates carrying state snapshots', () => {
    const previous = makeDoc('previous', { id: 'profile', title: 'Profile', state: { stage: 'draft' } });
    const next = makeDoc('next', { id: 'profile', title: 'Profile', state: { stage: 'published' } });

    const screens = entityScan.scanEntityDiffs(previous, next);

    assert.strictEqual(screens[0].entities[0].diffs[0].explanation.evidence.length, 0);
    assert.deepStrictEqual(screens[0].entities[0].diffs[0].explanation.before_predicate, {
      fact: 'entity_state',
      op: 'eq',
      value: { stage: 'draft' },
    });
    assert.deepStrictEqual(screens[0].entities[0].diffs[0].explanation.after_predicate, {
      fact: 'entity_state',
      op: 'eq',
      value: { stage: 'published' },
    });
  });

  it('emits entity_renamed when same id but title changes', () => {
    const previous = makeDoc('previous', { id: 'settings', title: 'Settings' });
    const next = makeDoc('next', { id: 'settings', title: 'Preferences' });

    const screens = entityScan.scanEntityDiffs(previous, next);
    const entityDiffs = screens[0].entities;

    assert.strictEqual(entityDiffs.length, 1);
    assert.strictEqual(entityDiffs[0].entity_id, 'settings');
    assert.strictEqual(entityDiffs[0].diffs.length, 1);
    const dec = entityDiffs[0].diffs[0].decision;
    assert.strictEqual(dec.diff_event, 'entity_renamed');
    assert.strictEqual(dec.target_id, 'settings');
    assert.strictEqual(dec.confidence, 1.0);
    assert.strictEqual(dec.confidence_band, 'high');
    assert.strictEqual(entityDiffs[0].diffs[0].explanation.evidence.length, 0);
  });

  it('emits entity_renamed as surface event with empty evidence', () => {
    const previous = makeDoc('previous', { id: 'dash', title: 'Dashboard' });
    const next = makeDoc('next', { id: 'dash', title: 'Home' });

    const screens = entityScan.scanEntityDiffs(previous, next);
    const record = screens[0].entities[0].diffs[0];

    assert.strictEqual(record.decision.diff_event, 'entity_renamed');
    assert.deepStrictEqual(record.explanation.evidence, []);
    assert.strictEqual(record.explanation.before_predicate, undefined);
    assert.strictEqual(record.explanation.after_predicate, undefined);
  });

  it('emits both entity_renamed and entity_state_changed when title and state both change', () => {
    const previous = makeDoc('previous', {
      id: 'cart',
      title: 'Cart',
      state: { count: 1 },
    });
    const next = makeDoc('next', {
      id: 'cart',
      title: 'Basket',
      state: { count: 3 },
    });

    const screens = entityScan.scanEntityDiffs(previous, next);
    const entityDiffs = screens[0].entities[0].diffs;

    assert.strictEqual(entityDiffs.length, 2);
    assert.strictEqual(entityDiffs[0].decision.diff_event, 'entity_renamed');
    assert.strictEqual(entityDiffs[1].decision.diff_event, 'entity_state_changed');
  });

  it('does not emit entity_renamed when title is unchanged', () => {
    const previous = makeDoc('previous', { id: 'home', title: 'Home', state: { active: true } });
    const next = makeDoc('next', { id: 'home', title: 'Home', state: { active: false } });

    const screens = entityScan.scanEntityDiffs(previous, next);
    const diffs = screens[0].entities[0].diffs;

    assert.strictEqual(diffs.length, 1);
    assert.strictEqual(diffs[0].decision.diff_event, 'entity_state_changed');
  });

  it('propagates entity_renamed into provider metadata totalRecords', () => {
    const provider = new providerModule.V2SemanticDiffProvider();
    const previous = makeDoc('previous', { id: 'profile', title: 'Profile' });
    const next = makeDoc('next', { id: 'profile', title: 'My Profile' });

    const result = provider.compareStructureDiff(previous, next);

    assert.ok(result.v2);
    assert.strictEqual(result.v2.metadata.totalRecords, 1);
    assert.strictEqual(result.v2.screens[0].entities[0].diffs[0].decision.diff_event, 'entity_renamed');
  });
});

describe('sortV2DiffRecords (Design G-2)', () => {
  let diffEventLayer;

  before(() => {
    diffEventLayer = require('../../out/core/diff/diff-event-layer');
  });

  it('sorts structure before surface before semantic', () => {
    const makeRecord = (event) => ({ decision: { diff_event: event } });

    const input = [
      makeRecord('entity_state_changed'),
      makeRecord('entity_renamed'),
      makeRecord('entity_removed'),
      makeRecord('entity_added'),
    ];

    const sorted = diffEventLayer.sortV2DiffRecords(input);

    assert.strictEqual(sorted[0].decision.diff_event, 'entity_added');
    assert.strictEqual(sorted[1].decision.diff_event, 'entity_removed');
    assert.strictEqual(sorted[2].decision.diff_event, 'entity_renamed');
    assert.strictEqual(sorted[3].decision.diff_event, 'entity_state_changed');
  });

  it('places entity_renamed (surface) between structure and semantic events', () => {
    const makeRecord = (event) => ({ decision: { diff_event: event } });

    const input = [
      makeRecord('component_action_changed'),
      makeRecord('entity_renamed'),
      makeRecord('component_added'),
    ];

    const sorted = diffEventLayer.sortV2DiffRecords(input);

    assert.strictEqual(sorted[0].decision.diff_event, 'component_added');
    assert.strictEqual(sorted[1].decision.diff_event, 'entity_renamed');
    assert.strictEqual(sorted[2].decision.diff_event, 'component_action_changed');
  });

  it('does not mutate the input array', () => {
    const makeRecord = (event) => ({ decision: { diff_event: event } });
    const input = [makeRecord('entity_state_changed'), makeRecord('entity_added')];
    const original = [...input];

    diffEventLayer.sortV2DiffRecords(input);

    assert.deepStrictEqual(input.map(r => r.decision.diff_event), original.map(r => r.decision.diff_event));
  });

  it('preserves stable full order for all 12 events', () => {
    const events = Object.keys(diffEventLayer.DIFF_EVENT_FULL_ORDER);
    assert.strictEqual(events.length, 12);
  });
});
