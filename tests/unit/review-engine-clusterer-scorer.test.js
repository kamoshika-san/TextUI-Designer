/**
 * Review Engine — Change Clusterer + Priority Scorer テスト
 * T-RE3-006 / T-RE3-009
 */

const assert = require('assert');

describe('review-engine: clusterChanges', () => {
  let re;

  before(() => {
    re = require('../../out/domain/review-engine');
  });

  function makeChange(changeId, componentId, classType) {
    return {
      changeId,
      type: 'UpdateProps',
      semanticChange: { type: 'UpdateProps', layer: 'behavior', componentId, identityBasis: 'stable-id' },
      metadata: classType ? { classType } : {}
    };
  }

  it('groups changes with same componentId and classType into one cluster', () => {
    const changes = [
      makeChange('c0', 'btn-submit', 'behavior'),
      makeChange('c1', 'btn-submit', 'behavior')
    ];
    const clusters = re.clusterChanges(changes);
    assert.strictEqual(clusters.length, 1);
    assert.strictEqual(clusters[0].changeIds.length, 2);
    assert.ok(clusters[0].changeIds.includes('c0'));
    assert.ok(clusters[0].changeIds.includes('c1'));
  });

  it('creates separate clusters for different componentIds', () => {
    const changes = [
      makeChange('c0', 'btn-submit', 'behavior'),
      makeChange('c1', 'input-email', 'content')
    ];
    const clusters = re.clusterChanges(changes);
    assert.strictEqual(clusters.length, 2);
  });

  it('creates separate clusters for same componentId but different classType', () => {
    const changes = [
      makeChange('c0', 'btn-submit', 'behavior'),
      makeChange('c1', 'btn-submit', 'layout')
    ];
    const clusters = re.clusterChanges(changes);
    assert.strictEqual(clusters.length, 2);
  });

  it('returns empty array for empty input', () => {
    assert.deepStrictEqual(re.clusterChanges([]), []);
  });

  it('cluster label includes componentId and classType', () => {
    const changes = [makeChange('c0', 'btn-submit', 'behavior')];
    const clusters = re.clusterChanges(changes);
    assert.ok(clusters[0].label.includes('btn-submit'));
    assert.ok(clusters[0].label.includes('behavior'));
  });

  it('clusterId is unique per componentId+classType combination', () => {
    const changes = [
      makeChange('c0', 'btn-a', 'behavior'),
      makeChange('c1', 'btn-b', 'behavior'),
      makeChange('c2', 'btn-a', 'layout')
    ];
    const clusters = re.clusterChanges(changes);
    const ids = clusters.map(c => c.clusterId);
    const unique = new Set(ids);
    assert.strictEqual(unique.size, ids.length, 'all clusterIds should be unique');
  });
});

describe('review-engine: Priority Scorer', () => {
  let re;

  before(() => {
    re = require('../../out/domain/review-engine');
  });

  // ── getChangeSeverity ─────────────────────────────────────────────────────

  it('behavior has highest severity (1.0)', () => {
    assert.strictEqual(re.getChangeSeverity('behavior'), 1.0);
  });

  it('style has lowest severity (0.3)', () => {
    assert.strictEqual(re.getChangeSeverity('style'), 0.3);
  });

  it('undefined classType returns default severity (0.5)', () => {
    assert.strictEqual(re.getChangeSeverity(undefined), 0.5);
  });

  it('severity order: behavior > content > layout > style', () => {
    assert.ok(re.getChangeSeverity('behavior') > re.getChangeSeverity('content'));
    assert.ok(re.getChangeSeverity('content')  > re.getChangeSeverity('layout'));
    assert.ok(re.getChangeSeverity('layout')   > re.getChangeSeverity('style'));
  });

  // ── calculatePriority ─────────────────────────────────────────────────────

  it('calculatePriority returns 0-100 range', () => {
    const cluster = { clusterId: 'cluster:btn:behavior', label: 'btn [behavior]', changeIds: ['c0'] };
    const score = re.calculatePriority(cluster, 80);
    assert.ok(score >= 0 && score <= 100, `score should be 0-100: ${score}`);
  });

  it('calculatePriority with impactScore=100 and behavior returns 100', () => {
    const cluster = { clusterId: 'cluster:btn:behavior', label: 'btn [behavior]', changeIds: ['c0'] };
    assert.strictEqual(re.calculatePriority(cluster, 100), 100);
  });

  it('calculatePriority with impactScore=100 and style returns 30', () => {
    const cluster = { clusterId: 'cluster:btn:style', label: 'btn [style]', changeIds: ['c0'] };
    assert.strictEqual(re.calculatePriority(cluster, 100), 30);
  });

  it('calculatePriority defaults impactScore to 50 when not provided', () => {
    const cluster = { clusterId: 'cluster:btn:behavior', label: 'btn [behavior]', changeIds: ['c0'] };
    const score = re.calculatePriority(cluster);
    assert.strictEqual(score, 50); // 50 * 1.0 = 50
  });

  // ── scoreClusters ─────────────────────────────────────────────────────────

  it('scoreClusters returns clusters sorted by priorityScore descending', () => {
    const clusters = [
      { clusterId: 'cluster:btn:style',    label: 'btn [style]',    changeIds: ['c0'] },
      { clusterId: 'cluster:btn:behavior', label: 'btn [behavior]', changeIds: ['c1'] },
      { clusterId: 'cluster:btn:layout',   label: 'btn [layout]',   changeIds: ['c2'] }
    ];
    const scored = re.scoreClusters(clusters);
    assert.ok(scored[0].priorityScore >= scored[1].priorityScore, 'first should have highest score');
    assert.ok(scored[1].priorityScore >= scored[2].priorityScore, 'second should be >= third');
  });

  it('scoreClusters attaches priorityScore to each cluster', () => {
    const clusters = [
      { clusterId: 'cluster:btn:content', label: 'btn [content]', changeIds: ['c0'] }
    ];
    const scored = re.scoreClusters(clusters);
    assert.ok(typeof scored[0].priorityScore === 'number');
  });

  it('scoreClusters uses impactScoreMap when provided', () => {
    const clusters = [
      { clusterId: 'cluster:btn:behavior', label: 'btn [behavior]', changeIds: ['c0'] }
    ];
    const map = new Map([['cluster:btn:behavior', 80]]);
    const scored = re.scoreClusters(clusters, map);
    assert.strictEqual(scored[0].priorityScore, 80); // 80 * 1.0 = 80
  });
});
