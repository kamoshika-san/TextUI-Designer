/**
 * semantic-diff-v2-panel-mapper unit tests
 */
const assert = require('assert');
const { describe, it } = require('mocha');

const { toVisualDiffV2FromPayload } = require('../../out/domain/diff/semantic-diff-v2-panel-mapper.js');

describe('toVisualDiffV2FromPayload', () => {
  it('returns hasChanges false for empty screens', () => {
    const out = toVisualDiffV2FromPayload({
      screens: [],
      metadata: { schemaVersion: 'v2-compare-logic/v0', totalRecords: 0 },
    });
    assert.strictEqual(out.hasChanges, false);
    assert.deepStrictEqual(out.payload.screens, []);
  });

  it('maps decision confidence band and predicate split fields', () => {
    const v2 = {
      screens: [
        {
          screen_id: 'screen_main',
          diffs: [],
          entities: [
            {
              entity_id: 'entity_orders',
              diffs: [],
              components: [
                {
                  component_id: 'cmp_submit',
                  diffs: [
                    {
                      decision: {
                        confidence_band: 'low',
                        diff_event: 'component_action_changed',
                        target_id: 'cmp_submit',
                        confidence: 0.72,
                        ambiguity_reason: 'action normalization fell back to heuristic',
                        review_status: 'needs_review',
                      },
                      explanation: {
                        evidence: [],
                        before_predicate: { op: 'eq', field: 'action.type', value: 'submit' },
                        after_predicate: { op: 'eq', field: 'action.type', value: 'approve' },
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
      metadata: { schemaVersion: 'v2-compare-logic/v0', totalRecords: 1 },
    };

    const out = toVisualDiffV2FromPayload(v2);
    assert.strictEqual(out.hasChanges, true);
    assert.strictEqual(out.payload.screens[0].screenId, 'screen_main');
    assert.strictEqual(out.payload.screens[0].entities[0].entityId, 'entity_orders');
    assert.strictEqual(out.payload.screens[0].entities[0].components[0].componentId, 'cmp_submit');
    const record = out.payload.screens[0].entities[0].components[0].diffs[0];
    assert.strictEqual(record.decision.diffEvent, 'component_action_changed');
    assert.strictEqual(record.decision.targetId, 'cmp_submit');
    assert.strictEqual(record.decision.confidenceBand, 'low');
    assert.strictEqual(record.decision.reviewStatus, 'needs_review');
    assert.deepStrictEqual(record.explanation.beforePredicate, {
      op: 'eq',
      field: 'action.type',
      value: 'submit',
    });
    assert.deepStrictEqual(record.explanation.afterPredicate, {
      op: 'eq',
      field: 'action.type',
      value: 'approve',
    });
  });

  it('preserves out-of-scope screens without treating them as changes', () => {
    const out = toVisualDiffV2FromPayload({
      screens: [{ screen_id: 'screen_new', outOfScope: true }],
      metadata: { schemaVersion: 'v2-compare-logic/v0', totalRecords: 0 },
    });

    assert.strictEqual(out.hasChanges, false);
    assert.deepStrictEqual(out.payload.screens, [{ screenId: 'screen_new', outOfScope: true }]);
  });

  it('treats screen-level diffs as changes', () => {
    const out = toVisualDiffV2FromPayload({
      screens: [
        {
          screen_id: 's1',
          diffs: [
            {
              decision: {
                confidence_band: 'high',
                diff_event: 'entity_added',
                target_id: 'e1',
                confidence: 1,
              },
              explanation: { evidence: [] },
            },
          ],
          entities: [],
        },
      ],
      metadata: { schemaVersion: 'v2-compare-logic/v0', totalRecords: 1 },
    });

    assert.strictEqual(out.hasChanges, true);
    assert.strictEqual(out.payload.screens[0].diffs.length, 1);
    assert.strictEqual(out.payload.screens[0].diffs[0].decision.diffEvent, 'entity_added');
  });
});
