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
    assert.deepStrictEqual(diffs[0].diffs[0].explanation.before_predicate, {
      fact: 'action',
      op: 'eq',
      value: { domain: 'trigger', type: 'submit' },
    });
    assert.deepStrictEqual(diffs[0].diffs[0].explanation.after_predicate, {
      fact: 'action',
      op: 'eq',
      value: { domain: 'trigger', type: 'approve' },
    });
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
    assert.deepStrictEqual(diffs[0].diffs[0].explanation.before_predicate, {
      fact: 'action',
      op: 'eq',
      value: { domain: 'none', type: 'none' },
    });
    assert.deepStrictEqual(diffs[0].diffs[0].explanation.after_predicate, {
      fact: 'action',
      op: 'eq',
      value: { domain: 'submit', type: 'submit' },
    });
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
      fact: 'availability',
      op: 'eq',
      value: {
        visibility: 'visible',
        enabled: 'enabled',
        editability: 'editable',
      },
    });
    assert.deepStrictEqual(diffs[0].diffs[0].explanation.after_predicate, {
      fact: 'availability',
      op: 'eq',
      value: {
        visibility: 'visible',
        enabled: 'disabled',
        editability: 'editable',
      },
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

  it('emits component_guard_changed for matched components whose guard changed', () => {
    const previous = makeDoc('previous', [
      { Button: { id: 'save', label: 'Save', guard: { op: 'eq', fact: 'mode', value: 'draft' } } },
    ]);
    const next = makeDoc('next', [
      { Button: { id: 'save', label: 'Save', guard: { op: 'eq', fact: 'mode', value: 'published' } } },
    ]);

    const diffs = componentScan.scanComponentDiffs(previous, next);

    assert.strictEqual(diffs.length, 1);
    assert.strictEqual(diffs[0].diffs[0].decision.diff_event, 'component_guard_changed');
    assert.strictEqual(diffs[0].diffs[0].decision.confidence_band, 'high');
  });

  it('drops component_guard_changed to low confidence when guard contains unresolved predicate', () => {
    const previous = makeDoc('previous', [
      { Button: { id: 'save', label: 'Save', guard: { kind: 'unresolved', reason: 'missing fact' } } },
    ]);
    const next = makeDoc('next', [
      { Button: { id: 'save', label: 'Save', guard: { op: 'eq', fact: 'mode', value: 'draft' } } },
    ]);

    const diffs = componentScan.scanComponentDiffs(previous, next);
    const decision = diffs[0].diffs[0].decision;

    assert.strictEqual(decision.diff_event, 'component_guard_changed');
    assert.strictEqual(decision.confidence, 0.7);
    assert.strictEqual(decision.confidence_band, 'low');
    assert.strictEqual(decision.review_status, 'needs_review');
  });

  it('treats reordered all_of guard clauses as equivalent', () => {
    const previous = makeDoc('previous', [
      {
        Button: {
          id: 'save',
          label: 'Save',
          guard: {
            op: 'all_of',
            all_of: [
              { op: 'eq', fact: 'mode', value: 'draft' },
              { op: 'exists', fact: 'canSave' },
            ],
          },
        },
      },
    ]);
    const next = makeDoc('next', [
      {
        Button: {
          id: 'save',
          label: 'Save',
          guard: {
            op: 'all_of',
            all_of: [
              { op: 'exists', fact: 'canSave' },
              { op: 'eq', fact: 'mode', value: 'draft' },
            ],
          },
        },
      },
    ]);

    const diffs = componentScan.scanComponentDiffs(previous, next);

    assert.strictEqual(diffs.length, 0);
  });

  it('folds single-child any_of guards before comparison', () => {
    const previous = makeDoc('previous', [
      {
        Button: {
          id: 'save',
          label: 'Save',
          guard: {
            op: 'any_of',
            any_of: [
              { op: 'eq', fact: 'mode', value: 'draft' },
            ],
          },
        },
      },
    ]);
    const next = makeDoc('next', [
      { Button: { id: 'save', label: 'Save', guard: { op: 'eq', fact: 'mode', value: 'draft' } } },
    ]);

    const diffs = componentScan.scanComponentDiffs(previous, next);

    assert.strictEqual(diffs.length, 0);
  });

  it('marks over-depth guards as low-confidence unresolved changes', () => {
    const previous = makeDoc('previous', [
      {
        Button: {
          id: 'save',
          label: 'Save',
          guard: {
            op: 'all_of',
            all_of: [
              {
                op: 'all_of',
                all_of: [
                  {
                    op: 'all_of',
                    all_of: [
                      {
                        op: 'all_of',
                        all_of: [
                          {
                            op: 'all_of',
                            all_of: [{ op: 'eq', fact: 'mode', value: 'draft' }],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        },
      },
    ]);
    const next = makeDoc('next', [
      { Button: { id: 'save', label: 'Save', guard: { op: 'eq', fact: 'mode', value: 'draft' } } },
    ]);

    const diffs = componentScan.scanComponentDiffs(previous, next);
    const decision = diffs[0].diffs[0].decision;

    assert.strictEqual(diffs.length, 1);
    assert.strictEqual(decision.diff_event, 'component_guard_changed');
    assert.strictEqual(decision.confidence_band, 'low');
    assert.strictEqual(decision.review_status, 'needs_review');
    assert.deepStrictEqual(diffs[0].diffs[0].explanation.before_predicate, {
      kind: 'unresolved',
      reason: 'guard_depth_exceeded',
    });
  });

  it('uses empty evidence for semantic component-level diff events', () => {
    const previous = makeDoc('previous', [
      { Button: { id: 'save', label: 'Save', action: { trigger: 'submit' } } },
    ]);
    const next = makeDoc('next', [
      { Button: { id: 'save', label: 'Save', action: { trigger: 'approve' } } },
    ]);

    const diffs = componentScan.scanComponentDiffs(previous, next);

    assert.ok(Array.isArray(diffs[0].diffs[0].explanation.evidence));
    assert.strictEqual(diffs[0].diffs[0].explanation.evidence.length, 0);
  });

  it('uses empty evidence on structure events and semantic events (compare-logic F)', () => {
    const cases = [
      {
        label: 'component_added',
        previous: makeDoc('previous', []),
        next: makeDoc('next', [{ Button: { id: 'btn', label: 'X' } }]),
        expectedEvent: 'component_added',
      },
      {
        label: 'component_removed',
        previous: makeDoc('previous', [{ Button: { id: 'btn', label: 'X' } }]),
        next: makeDoc('next', []),
        expectedEvent: 'component_removed',
      },
      {
        label: 'component_action_changed',
        previous: makeDoc('previous', [{ Button: { id: 'btn', label: 'X', action: { trigger: 'a' } } }]),
        next: makeDoc('next', [{ Button: { id: 'btn', label: 'X', action: { trigger: 'b' } } }]),
        expectedEvent: 'component_action_changed',
      },
      {
        label: 'component_availability_changed',
        previous: makeDoc('previous', [{ Button: { id: 'btn', label: 'X', disabled: false } }]),
        next: makeDoc('next', [{ Button: { id: 'btn', label: 'X', disabled: true } }]),
        expectedEvent: 'component_availability_changed',
      },
      {
        label: 'component_guard_changed',
        previous: makeDoc('previous', [{ Button: { id: 'btn', label: 'X', guard: { op: 'eq', fact: 'f', value: '1' } } }]),
        next: makeDoc('next', [{ Button: { id: 'btn', label: 'X', guard: { op: 'eq', fact: 'f', value: '2' } } }]),
        expectedEvent: 'component_guard_changed',
      },
    ];

    for (const { label, previous, next, expectedEvent } of cases) {
      const diffs = componentScan.scanComponentDiffs(previous, next);
      assert.strictEqual(diffs.length, 1, `${label}: expected 1 diff`);
      const evidence = diffs[0].diffs[0].explanation.evidence;
      assert.ok(Array.isArray(evidence) && evidence.length === 0, `${label}: evidence must be empty`);
      assert.strictEqual(diffs[0].diffs[0].decision.diff_event, expectedEvent, `${label}: diff_event`);
    }
  });

  it('returns component diffs in stable component_id order', () => {
    const previous = makeDoc('previous', [
      { Button: { id: 'b', label: 'B' } },
      { Button: { id: 'a', label: 'A' } },
    ]);
    const next = makeDoc('next', [
      { Button: { id: 'b', label: 'B', disabled: true } },
      { Button: { id: 'a', label: 'A', action: { trigger: 'go' } } },
    ]);

    const diffs = componentScan.scanComponentDiffs(previous, next);

    assert.deepStrictEqual(diffs.map(diff => diff.component_id), ['Button:a', 'Button:b']);
  });
});
