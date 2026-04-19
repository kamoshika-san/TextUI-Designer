/**
 * semantic-diff-v2-panel-mapper — Wave 1（domain + mapper）
 */
const assert = require('assert');
const { describe, it } = require('mocha');

const { toVisualDiffV2FromPayload } = require('../../out/domain/diff/semantic-diff-v2-panel-mapper.js');

describe('toVisualDiffV2FromPayload', () => {
  it('空 screens — hasChanges false', () => {
    const out = toVisualDiffV2FromPayload({
      screens: [],
      metadata: { schemaVersion: 'v2-compare-logic/v0', totalRecords: 0 },
    });
    assert.strictEqual(out.hasChanges, false);
    assert.deepStrictEqual(out.payload.screens, []);
  });

  it('単一 screen / entity / component / diff — camelCase と hasChanges', () => {
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
                        diff_event: 'component_action_changed',
                        target_id: 'cmp_submit#action',
                        confidence: 0.92,
                      },
                      explanation: { evidence: [], canonical_predicate: { op: 'eq' } },
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
    const d = out.payload.screens[0].entities[0].components[0].diffs[0].decision;
    assert.strictEqual(d.diffEvent, 'component_action_changed');
    assert.strictEqual(d.targetId, 'cmp_submit#action');
    assert.strictEqual(d.confidenceBand, 'high');
    assert.deepStrictEqual(
      out.payload.screens[0].entities[0].components[0].diffs[0].explanation.canonicalPredicate,
      { op: 'eq' },
    );
  });

  it('screen 直下 diffs のみ — hasChanges true', () => {
    const v2 = {
      screens: [
        {
          screen_id: 's1',
          diffs: [
            {
              decision: {
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
    };
    const out = toVisualDiffV2FromPayload(v2);
    assert.strictEqual(out.hasChanges, true);
    assert.strictEqual(out.payload.screens[0].diffs.length, 1);
    assert.strictEqual(out.payload.screens[0].diffs[0].decision.diffEvent, 'entity_added');
  });
});
