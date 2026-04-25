const assert = require('assert');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
require('ts-node/register/transpile-only');
const { OverlayDiffV2Panel } = require('../../src/renderer/components/OverlayDiffV2Panel.tsx');

describe('OverlayDiffV2Panel', () => {
  it('renders an MVP tree with screen, entity, component, diff details, and evidence', () => {
    const html = renderToStaticMarkup(
      React.createElement(OverlayDiffV2Panel, {
        result: {
          hasChanges: true,
          payload: {
            screens: [
              {
                screenId: 'settings',
                diffs: [],
                entities: [
                  {
                    entityId: 'settings-form',
                    diffs: [
                      {
                        decision: {
                          diffEvent: 'entity_state_changed',
                          targetId: 'settings-form',
                          confidence: 0.9,
                          confidenceBand: 'high',
                        },
                        explanation: {
                          evidence: ['entity state changed'],
                        },
                      },
                    ],
                    components: [
                      {
                        componentId: 'Button:save',
                        diffs: [
                          {
                            decision: {
                              diffEvent: 'component_guard_changed',
                              targetId: 'save',
                              confidence: 0.7,
                              confidenceBand: 'low',
                              reviewStatus: 'needs_review',
                              ambiguityReason: 'guard contains unresolved predicate',
                            },
                            explanation: {
                              evidence: ['guard axis changed with unresolved predicate'],
                            },
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
      })
    );

    assert.match(html, /Semantic Diff v2/);
    assert.match(html, /settings/);
    assert.match(html, /settings-form/);
    assert.match(html, /Button:save/);
    assert.match(html, /component guard changed/);
    assert.match(html, /needs_review/);
    assert.match(html, /0\.70/);
    assert.match(html, /guard axis changed with unresolved predicate/);
  });

  it('renders out-of-scope screens distinctly from in-scope screens', () => {
    const html = renderToStaticMarkup(
      React.createElement(OverlayDiffV2Panel, {
        result: {
          hasChanges: true,
          payload: {
            screens: [
              {
                screenId: 'legacy-screen',
                outOfScope: true,
              },
              {
                screenId: 'profile',
                diffs: [],
                entities: [],
              },
            ],
          },
        },
      })
    );

    assert.match(html, /legacy-screen/);
    assert.match(html, /out of scope/);
    assert.match(html, /profile/);
    assert.match(html, /1 out-of-scope screen/);
    assert.match(html, /1 in-scope screen/);
  });
});

describe('OverlayDiffV2Panel — evidence and predicate rendering', () => {
  const { renderPredicateCompact } = require('../../src/renderer/components/OverlayDiffV2Panel.tsx');

  function makeResult(diffs) {
    return {
      hasChanges: true,
      payload: {
        screens: [{
          screenId: 'main',
          diffs: [],
          entities: [{
            entityId: 'form',
            diffs,
            components: [],
          }],
        }],
      },
    };
  }

  it('renders state_machine.transition evidence as a structured before/after table', () => {
    const html = renderToStaticMarkup(
      React.createElement(OverlayDiffV2Panel, {
        result: makeResult([{
          decision: {
            diffEvent: 'transition_edge_changed',
            targetId: 'nav-submit',
            confidence: 1.0,
            confidenceBand: 'high',
          },
          explanation: {
            evidence: [{
              evidence_shape: 'state_machine.transition',
              before: { from: 'idle', to: 'submitting', trigger: 'submit.click' },
              after: { from: 'active', to: 'validating', trigger: 'submit.tap' },
            }],
          },
        }]),
      })
    );

    assert.match(html, /transition-evidence-table/);
    assert.match(html, /idle/);
    assert.match(html, /active/);
    assert.match(html, /submitting/);
    assert.match(html, /validating/);
    assert.match(html, /submit\.click/);
    assert.match(html, /submit\.tap/);
  });

  it('renders before/after predicates for entity_state_changed', () => {
    const html = renderToStaticMarkup(
      React.createElement(OverlayDiffV2Panel, {
        result: makeResult([{
          decision: {
            diffEvent: 'entity_state_changed',
            targetId: 'form',
            confidence: 1.0,
            confidenceBand: 'high',
          },
          explanation: {
            evidence: [],
            beforePredicate: { fact: 'entity_state', op: 'eq', value: { mode: 'draft' } },
            afterPredicate: { fact: 'entity_state', op: 'eq', value: { mode: 'published' } },
          },
        }]),
      })
    );

    assert.match(html, /before-after-predicates/);
    assert.match(html, /before-predicate/);
    assert.match(html, /after-predicate/);
    assert.match(html, /entity_state eq/);
    assert.match(html, /draft/);
    assert.match(html, /published/);
  });

  it('renders before/after predicates for component_action_changed', () => {
    const html = renderToStaticMarkup(
      React.createElement(OverlayDiffV2Panel, {
        result: makeResult([{
          decision: {
            diffEvent: 'component_action_changed',
            targetId: 'btn-submit',
            confidence: 1.0,
            confidenceBand: 'high',
          },
          explanation: {
            evidence: [],
            beforePredicate: { fact: 'action', op: 'eq', value: { domain: 'persist', type: 'update' } },
            afterPredicate: { fact: 'action', op: 'eq', value: { domain: 'workflow', type: 'submit' } },
          },
        }]),
      })
    );

    assert.match(html, /action eq/);
    assert.match(html, /persist/);
    assert.match(html, /workflow/);
  });

  it('shows low-confidence band as amber with warning marker', () => {
    const html = renderToStaticMarkup(
      React.createElement(OverlayDiffV2Panel, {
        result: makeResult([{
          decision: {
            diffEvent: 'component_guard_changed',
            targetId: 'btn',
            confidence: 0.5,
            confidenceBand: 'low',
            reviewStatus: 'needs_review',
            ambiguityReason: 'guard contains unresolved predicate',
          },
          explanation: { evidence: [] },
        }]),
      })
    );

    assert.match(html, /0\.50 ⚠ low/);
    assert.match(html, /needs_review/);
    assert.match(html, /ambiguity: guard contains unresolved predicate/);
  });

  it('shows nothing for structure events with no evidence or predicates', () => {
    const html = renderToStaticMarkup(
      React.createElement(OverlayDiffV2Panel, {
        result: makeResult([{
          decision: {
            diffEvent: 'entity_added',
            targetId: 'new-form',
            confidence: 1.0,
            confidenceBand: 'high',
          },
          explanation: { evidence: [] },
        }]),
      })
    );

    assert.match(html, /entity added/);
    assert.doesNotMatch(html, /before-after-predicates/);
    assert.doesNotMatch(html, /transition-evidence-table/);
  });

  it('falls back to JSON display for unknown evidence shapes', () => {
    const html = renderToStaticMarkup(
      React.createElement(OverlayDiffV2Panel, {
        result: makeResult([{
          decision: {
            diffEvent: 'transition_edge_changed',
            targetId: 't1',
            confidence: 1.0,
            confidenceBand: 'high',
          },
          explanation: {
            evidence: [{ evidence_shape: 'unknown.shape', data: 'foo' }],
          },
        }]),
      })
    );

    assert.match(html, /unknown\.shape/);
    assert.doesNotMatch(html, /transition-evidence-table/);
  });

  it('suppresses before/after predicates when state_machine.transition evidence is present', () => {
    const html = renderToStaticMarkup(
      React.createElement(OverlayDiffV2Panel, {
        result: makeResult([{
          decision: {
            diffEvent: 'transition_edge_changed',
            targetId: 't1',
            confidence: 1.0,
            confidenceBand: 'high',
          },
          explanation: {
            evidence: [{
              evidence_shape: 'state_machine.transition',
              before: { from: 'idle', to: 'busy', trigger: 'start' },
              after: { from: 'idle', to: 'done', trigger: 'finish' },
            }],
            beforePredicate: { fact: 'entity_state', op: 'eq', value: { kind: 'v2.transition_edge_snapshot', from: 'idle', to: 'busy', trigger: 'start' } },
            afterPredicate: { fact: 'entity_state', op: 'eq', value: { kind: 'v2.transition_edge_snapshot', from: 'idle', to: 'done', trigger: 'finish' } },
          },
        }]),
      })
    );

    assert.match(html, /transition-evidence-table/);
    assert.doesNotMatch(html, /before-after-predicates/);
    assert.doesNotMatch(html, /v2\.transition_edge_snapshot/);
  });

  it('renders before/after title predicates for entity_renamed', () => {
    const html = renderToStaticMarkup(
      React.createElement(OverlayDiffV2Panel, {
        result: makeResult([{
          decision: {
            diffEvent: 'entity_renamed',
            targetId: 'dash',
            confidence: 1.0,
            confidenceBand: 'high',
          },
          explanation: {
            evidence: [],
            beforePredicate: { fact: 'entity_state', op: 'eq', value: 'Dashboard' },
            afterPredicate: { fact: 'entity_state', op: 'eq', value: 'Home' },
          },
        }]),
      })
    );

    assert.match(html, /before-after-predicates/);
    assert.match(html, /Dashboard/);
    assert.match(html, /Home/);
  });
});

describe('renderPredicateCompact', () => {
  const { renderPredicateCompact } = require('../../src/renderer/components/OverlayDiffV2Panel.tsx');

  it('formats atomic eq predicate', () => {
    assert.strictEqual(
      renderPredicateCompact({ fact: 'entity_state', op: 'eq', value: 'draft' }),
      'entity_state eq draft'
    );
  });

  it('formats exists predicate without value', () => {
    assert.strictEqual(
      renderPredicateCompact({ fact: 'role', op: 'exists' }),
      'role exists'
    );
  });

  it('formats in predicate with array value', () => {
    assert.strictEqual(
      renderPredicateCompact({ fact: 'entity_state', op: 'in', value: ['a', 'b'] }),
      'entity_state in [a, b]'
    );
  });

  it('formats all_of logical predicate', () => {
    const result = renderPredicateCompact({
      op: 'all_of',
      all_of: [
        { fact: 'role', op: 'eq', value: 'admin' },
        { fact: 'availability', op: 'exists' },
      ],
    });
    assert.strictEqual(result, 'all_of(role eq admin, availability exists)');
  });

  it('formats not predicate', () => {
    assert.strictEqual(
      renderPredicateCompact({ op: 'not', not: { fact: 'role', op: 'eq', value: 'guest' } }),
      'not(role eq guest)'
    );
  });

  it('truncates nested logical at depth 2', () => {
    const result = renderPredicateCompact({
      op: 'all_of',
      all_of: [{
        op: 'any_of',
        any_of: [{
          op: 'all_of',
          all_of: [{ fact: 'role', op: 'eq', value: 'x' }],
        }],
      }],
    });
    assert.match(result, /all_of\(…\)/);
  });

  it('formats unresolved predicate with reason', () => {
    assert.strictEqual(
      renderPredicateCompact({ kind: 'unresolved', reason: 'guard_fact_not_in_v0_ontology' }),
      '⚠ unresolved: guard_fact_not_in_v0_ontology'
    );
  });

  it('includes candidates for unresolved predicate', () => {
    const result = renderPredicateCompact({
      kind: 'unresolved',
      reason: 'guard_fact_not_in_v0_ontology',
      candidates: ['foo', 'bar'],
    });
    assert.match(result, /\[foo, bar\]/);
  });

  it('formats object value in eq predicate', () => {
    const result = renderPredicateCompact({
      fact: 'entity_state',
      op: 'eq',
      value: { mode: 'draft', count: 3 },
    });
    assert.match(result, /entity_state eq/);
    assert.match(result, /mode: draft/);
    assert.match(result, /count: 3/);
  });
});
