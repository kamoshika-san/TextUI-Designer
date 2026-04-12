const assert = require('assert');

describe('diff-result-external: toExternalDiffResult', () => {
  let adapter;

  before(() => {
    adapter = require('../../out/services/semantic-diff/diff-result-external-adapter');
  });

  function makeCompareResult(changes = [], confidence = 'high') {
    return {
      kind: 'semantic-diff-result/v1',
      metadata: {
        repoRoot: '/repo',
        filePath: '/repo/screen.tui.yml',
        relativeFilePath: 'screen.tui.yml',
        baseRef: 'HEAD~1',
        headRef: 'HEAD',
        comparedAt: '2026-04-12T00:00:00.000Z',
      },
      diff: {
        summary: { added: 1, removed: 0, modified: 1, moved: 0 },
        changes,
        grouped: [],
        confidence: {
          score: 0.9,
          band: confidence,
          tier: 'accept',
          reasonSummary: '',
          ambiguousChanges: 0,
          lowConfidenceChanges: 0,
          recommendedAction: 'promote',
        },
      },
    };
  }

  it('sets schemaVersion to diff-result-external/v1', () => {
    const result = adapter.toExternalDiffResult(makeCompareResult());
    assert.strictEqual(result.schemaVersion, 'diff-result-external/v1');
  });

  it('maps metadata fields correctly', () => {
    const result = adapter.toExternalDiffResult(makeCompareResult());
    assert.strictEqual(result.metadata.baseRef, 'HEAD~1');
    assert.strictEqual(result.metadata.headRef, 'HEAD');
    assert.strictEqual(result.metadata.filePath, 'screen.tui.yml');
    assert.strictEqual(result.metadata.comparedAt, '2026-04-12T00:00:00.000Z');
  });

  it('maps summary fields correctly', () => {
    const result = adapter.toExternalDiffResult(makeCompareResult());
    assert.strictEqual(result.summary.added, 1);
    assert.strictEqual(result.summary.removed, 0);
    assert.strictEqual(result.summary.modified, 1);
    assert.strictEqual(result.summary.moved, 0);
    assert.strictEqual(result.summary.confidence, 'high');
  });

  it('maps changes with changeId, type, componentId, layer, impact', () => {
    const changes = [{
      type: 'UpdateProps',
      layer: 'visual',
      componentId: 'btn-submit',
      identityBasis: 'stable-id',
      humanReadable: { title: 'Label changed', description: 'Submit -> Submit Order', impact: 'low' },
    }];
    const result = adapter.toExternalDiffResult(makeCompareResult(changes));
    assert.strictEqual(result.changes.length, 1);
    assert.strictEqual(result.changes[0].changeId, 'change-0');
    assert.strictEqual(result.changes[0].type, 'UpdateProps');
    assert.strictEqual(result.changes[0].componentId, 'btn-submit');
    assert.strictEqual(result.changes[0].layer, 'visual');
    assert.strictEqual(result.changes[0].impact, 'low');
    assert.strictEqual(result.changes[0].humanReadable.title, 'Label changed');
  });

  it('falls back to low confidence for unknown band', () => {
    const result = adapter.toExternalDiffResult(makeCompareResult([], 'unknown-band'));
    assert.strictEqual(result.summary.confidence, 'low');
  });
});
