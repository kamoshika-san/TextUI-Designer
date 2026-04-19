const assert = require('assert');

describe('semantic diff v2 component scan', () => {
  let structureDiff;
  let componentScan;

  before(() => {
    structureDiff = require('../../out/core/diff/structure-diff');
    componentScan = require('../../out/core/diff/v2-diff-component-scan');
  });

  function makeDoc(side, components) {
    return structureDiff.createNormalizedDiffDocument(
      { page: { id: 'page', title: 'Page', layout: 'vertical', components } },
      { side }
    );
  }

  it('emits component_action_changed for a matched button whose trigger changed', () => {
    const previous = makeDoc('previous', [
      { Button: { id: 'submit', label: 'Submit', action: { trigger: 'submit' } } },
    ]);
    const next = makeDoc('next', [
      { Button: { id: 'submit', label: 'Submit', action: { trigger: 'approve' } } },
    ]);

    const diffs = componentScan.scanComponentDiffs(previous, next);

    assert.strictEqual(diffs.length, 1);
    assert.strictEqual(diffs[0].component_id, 'Button:submit');
    assert.strictEqual(diffs[0].diffs[0].decision.diff_event, 'component_action_changed');
    assert.deepStrictEqual(diffs[0].diffs[0].explanation.before_predicate, { domain: 'trigger', type: 'submit' });
    assert.deepStrictEqual(diffs[0].diffs[0].explanation.after_predicate, { domain: 'trigger', type: 'approve' });
  });

  it('does not emit component_action_changed for add/remove-only changes', () => {
    const previous = makeDoc('previous', []);
    const next = makeDoc('next', [
      { Button: { id: 'submit', label: 'Submit', action: { trigger: 'submit' } } },
    ]);

    const diffs = componentScan.scanComponentDiffs(previous, next);

    assert.strictEqual(diffs.length, 1);
    assert.strictEqual(diffs[0].diffs[0].decision.diff_event, 'component_added');
  });

  it('treats submit flag changes as action changes for matched buttons', () => {
    const previous = makeDoc('previous', [
      { Button: { id: 'submit', label: 'Submit', submit: false } },
    ]);
    const next = makeDoc('next', [
      { Button: { id: 'submit', label: 'Submit', submit: true } },
    ]);

    const diffs = componentScan.scanComponentDiffs(previous, next);

    assert.strictEqual(diffs.length, 1);
    assert.strictEqual(diffs[0].diffs[0].decision.diff_event, 'component_action_changed');
    assert.deepStrictEqual(diffs[0].diffs[0].explanation.before_predicate, { domain: 'none', type: 'none' });
    assert.deepStrictEqual(diffs[0].diffs[0].explanation.after_predicate, { domain: 'submit', type: 'submit' });
  });

  it('emits component_availability_changed for matched components whose disabled state changed', () => {
    const previous = makeDoc('previous', [
      { Button: { label: 'Submit', disabled: false } },
    ]);
    const next = makeDoc('next', [
      { Button: { label: 'Submit', disabled: true } },
    ]);

    const diffs = componentScan.scanComponentDiffs(previous, next);

    assert.strictEqual(diffs.length, 1);
    assert.strictEqual(diffs[0].component_id, 'Button:structural:0');
    assert.strictEqual(diffs[0].diffs[0].decision.diff_event, 'component_availability_changed');
    assert.deepStrictEqual(diffs[0].diffs[0].explanation.before_predicate, {
      visibility: 'visible',
      enabled: 'enabled',
      editability: 'editable',
    });
    assert.deepStrictEqual(diffs[0].diffs[0].explanation.after_predicate, {
      visibility: 'visible',
      enabled: 'disabled',
      editability: 'editable',
    });
  });

  it('emits component_availability_changed for visibility changes without add/remove noise', () => {
    const previous = makeDoc('previous', [
      { Button: { label: 'Submit', visible: true } },
    ]);
    const next = makeDoc('next', [
      { Button: { label: 'Submit', visible: false } },
    ]);

    const diffs = componentScan.scanComponentDiffs(previous, next);

    assert.strictEqual(diffs.length, 1);
    assert.strictEqual(diffs[0].diffs[0].decision.diff_event, 'component_availability_changed');
  });
});
