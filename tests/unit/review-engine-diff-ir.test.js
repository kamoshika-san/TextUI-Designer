/**
 * Review Engine — DiffIR / ReviewPipeline / SemanticDiffAdapter テスト
 * T-RE0-004 / T-RE0-006 / T-RE0-010
 */

const assert = require('assert');

describe('review-engine: DiffIR and SemanticDiffAdapter', () => {
  let reviewEngine;

  before(() => {
    reviewEngine = require('../../out/domain/review-engine');
  });

  // ── semanticDiffToDiffIR ──────────────────────────────────────────────────

  it('converts empty SemanticDiff to DiffIR with kind and summary', () => {
    const emptyDiff = {
      summary: { added: 0, removed: 0, modified: 0, moved: 0 },
      changes: [],
      grouped: [],
      confidence: {
        score: 1.0,
        band: 'high',
        tier: 'accept',
        reasonSummary: 'no changes',
        ambiguousChanges: 0,
        lowConfidenceChanges: 0,
        recommendedAction: 'promote'
      }
    };

    const ir = reviewEngine.semanticDiffToDiffIR(emptyDiff);

    assert.strictEqual(ir.kind, 'diff-ir/v1');
    assert.deepStrictEqual(ir.summary, { added: 0, removed: 0, modified: 0, moved: 0 });
    assert.deepStrictEqual(ir.changes, []);
    assert.strictEqual(ir.decisions, undefined);
    assert.strictEqual(ir.impacts, undefined);
    assert.strictEqual(ir.clusters, undefined);
  });

  it('assigns sequential changeIds to each SemanticChange', () => {
    const diff = {
      summary: { added: 1, removed: 1, modified: 0, moved: 0 },
      changes: [
        {
          type: 'AddComponent',
          layer: 'structure',
          componentId: 'btn-1',
          identityBasis: 'stable-id'
        },
        {
          type: 'RemoveComponent',
          layer: 'structure',
          componentId: 'btn-2',
          identityBasis: 'stable-id'
        }
      ],
      grouped: [],
      confidence: {
        score: 0.9,
        band: 'high',
        tier: 'accept',
        reasonSummary: '',
        ambiguousChanges: 0,
        lowConfidenceChanges: 0,
        recommendedAction: 'promote'
      }
    };

    const ir = reviewEngine.semanticDiffToDiffIR(diff);

    assert.strictEqual(ir.changes.length, 2);
    assert.strictEqual(ir.changes[0].changeId, 'change-0');
    assert.strictEqual(ir.changes[1].changeId, 'change-1');
    assert.strictEqual(ir.changes[0].type, 'AddComponent');
    assert.strictEqual(ir.changes[1].type, 'RemoveComponent');
  });

  it('extracts before/after for UpdateProps changes', () => {
    const diff = {
      summary: { added: 0, removed: 0, modified: 1, moved: 0 },
      changes: [
        {
          type: 'UpdateProps',
          layer: 'behavior',
          componentId: 'input-1',
          identityBasis: 'stable-id',
          propKey: 'label',
          before: 'Old Label',
          after: 'New Label'
        }
      ],
      grouped: [],
      confidence: {
        score: 0.95,
        band: 'high',
        tier: 'accept',
        reasonSummary: '',
        ambiguousChanges: 0,
        lowConfidenceChanges: 0,
        recommendedAction: 'promote'
      }
    };

    const ir = reviewEngine.semanticDiffToDiffIR(diff);
    const change = ir.changes[0];

    assert.strictEqual(change.before, 'Old Label');
    assert.strictEqual(change.after, 'New Label');
    assert.deepStrictEqual(change.metadata, {});
  });

  it('does not set before/after for structural changes (AddComponent)', () => {
    const diff = {
      summary: { added: 1, removed: 0, modified: 0, moved: 0 },
      changes: [
        {
          type: 'AddComponent',
          layer: 'structure',
          componentId: 'new-btn',
          identityBasis: 'stable-id'
        }
      ],
      grouped: [],
      confidence: {
        score: 1.0,
        band: 'high',
        tier: 'accept',
        reasonSummary: '',
        ambiguousChanges: 0,
        lowConfidenceChanges: 0,
        recommendedAction: 'promote'
      }
    };

    const ir = reviewEngine.semanticDiffToDiffIR(diff);
    const change = ir.changes[0];

    assert.strictEqual(change.before, undefined);
    assert.strictEqual(change.after, undefined);
  });

  it('preserves original semanticChange reference in each Change', () => {
    const semanticChange = {
      type: 'UpdateEvent',
      layer: 'behavior',
      componentId: 'btn-submit',
      identityBasis: 'stable-id',
      eventKey: 'onClick',
      before: "navigate('/home')",
      after: "navigate('/dashboard')"
    };

    const diff = {
      summary: { added: 0, removed: 0, modified: 1, moved: 0 },
      changes: [semanticChange],
      grouped: [],
      confidence: {
        score: 0.8,
        band: 'high',
        tier: 'accept',
        reasonSummary: '',
        ambiguousChanges: 0,
        lowConfidenceChanges: 0,
        recommendedAction: 'promote'
      }
    };

    const ir = reviewEngine.semanticDiffToDiffIR(diff);
    assert.strictEqual(ir.changes[0].semanticChange, semanticChange);
  });
});

describe('review-engine: ReviewPipeline', () => {
  let reviewEngine;

  before(() => {
    reviewEngine = require('../../out/domain/review-engine');
  });

  const makeMinimalIR = () => ({
    kind: 'diff-ir/v1',
    summary: { added: 0, removed: 0, modified: 0, moved: 0 },
    changes: []
  });

  it('runs with no stages and returns the input IR unchanged', async () => {
    const pipeline = new reviewEngine.ReviewPipeline([]);
    const ir = makeMinimalIR();
    const result = await pipeline.run(ir);

    assert.strictEqual(result.ir.kind, 'diff-ir/v1');
    assert.deepStrictEqual(result.ir.changes, []);
    assert.deepStrictEqual(result.stageDurations, {});
  });

  it('returns stage names in registration order', () => {
    const stageA = { name: 'classify', process: ir => ir };
    const stageB = { name: 'impact', process: ir => ir };
    const pipeline = new reviewEngine.ReviewPipeline([stageA, stageB]);

    assert.deepStrictEqual(pipeline.getStageNames(), ['classify', 'impact']);
  });

  it('passes IR through each stage in order', async () => {
    const log = [];
    const stageA = {
      name: 'stage-a',
      process: ir => {
        log.push('a');
        return { ...ir, _a: true };
      }
    };
    const stageB = {
      name: 'stage-b',
      process: ir => {
        log.push('b');
        return { ...ir, _b: true };
      }
    };

    const pipeline = new reviewEngine.ReviewPipeline([stageA, stageB]);
    const result = await pipeline.run(makeMinimalIR());

    assert.deepStrictEqual(log, ['a', 'b']);
    assert.strictEqual(result.ir._a, true);
    assert.strictEqual(result.ir._b, true);
  });

  it('records duration for each stage', async () => {
    const stage = { name: 'timed-stage', process: ir => ir };
    const pipeline = new reviewEngine.ReviewPipeline([stage]);
    const result = await pipeline.run(makeMinimalIR());

    assert.ok('timed-stage' in result.stageDurations);
    assert.ok(typeof result.stageDurations['timed-stage'] === 'number');
  });
});
