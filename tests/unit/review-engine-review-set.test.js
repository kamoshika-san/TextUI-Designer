/**
 * Review Engine — Review Set Builder テスト
 * T-RE3-012
 */

const assert = require('assert');

describe('review-engine: buildReviewSet', () => {
  let re;

  before(() => {
    re = require('../../out/domain/review-engine');
  });

  function makeCluster(clusterId, label, changeIds, priorityScore) {
    return { clusterId, label, changeIds, priorityScore };
  }

  it('returns empty ReviewSet for empty clusters', () => {
    const rs = re.buildReviewSet([]);
    assert.strictEqual(rs.items.length, 0);
    assert.strictEqual(rs.totalClusters, 0);
  });

  it('returns top N clusters by default topN=10', () => {
    const clusters = Array.from({ length: 15 }, (_, i) =>
      makeCluster(`c${i}`, `label-${i}`, ['x'], 100 - i)
    );
    const rs = re.buildReviewSet(clusters);
    assert.strictEqual(rs.topN, 10);
    assert.strictEqual(rs.items.length, 10);
    assert.strictEqual(rs.totalClusters, 15);
  });

  it('respects custom topN', () => {
    const clusters = Array.from({ length: 5 }, (_, i) =>
      makeCluster(`c${i}`, `label-${i}`, ['x'], 50 - i)
    );
    const rs = re.buildReviewSet(clusters, { topN: 3 });
    assert.strictEqual(rs.items.length, 3);
    assert.strictEqual(rs.topN, 3);
  });

  it('returns all clusters when topN > total', () => {
    const clusters = [makeCluster('c0', 'label', ['x'], 80)];
    const rs = re.buildReviewSet(clusters, { topN: 10 });
    assert.strictEqual(rs.items.length, 1);
  });

  it('assigns sequential rank starting from 1', () => {
    const clusters = [
      makeCluster('c0', 'a', ['x'], 90),
      makeCluster('c1', 'b', ['x'], 70)
    ];
    const rs = re.buildReviewSet(clusters, { topN: 2 });
    assert.strictEqual(rs.items[0].rank, 1);
    assert.strictEqual(rs.items[1].rank, 2);
  });

  it('returns empty ReviewSet when topN is 0', () => {
    const clusters = [makeCluster('c0', 'a', ['x'], 80)];
    const rs = re.buildReviewSet(clusters, { topN: 0 });
    assert.strictEqual(rs.items.length, 0);
  });

  it('item.priorityScore matches cluster.priorityScore', () => {
    const clusters = [makeCluster('c0', 'a', ['x'], 75)];
    const rs = re.buildReviewSet(clusters, { topN: 1 });
    assert.strictEqual(rs.items[0].priorityScore, 75);
  });
});

describe('review-engine: formatReviewSetMarkdown', () => {
  let re;

  before(() => {
    re = require('../../out/domain/review-engine');
  });

  it('starts with ## Review Set header', () => {
    const rs = { topN: 0, totalClusters: 0, items: [] };
    const md = re.formatReviewSetMarkdown(rs);
    assert.ok(md.startsWith('## Review Set'));
  });

  it('includes label and change count for each item', () => {
    const rs = {
      topN: 1,
      totalClusters: 1,
      items: [{
        rank: 1,
        cluster: { clusterId: 'c0', label: 'btn-submit [behavior]', changeIds: ['x', 'y'] },
        priorityScore: 80
      }]
    };
    const md = re.formatReviewSetMarkdown(rs);
    assert.ok(md.includes('btn-submit [behavior]'));
    assert.ok(md.includes('2 changes'));
    assert.ok(md.includes('80'));
  });

  it('shows _No items to review._ for empty set', () => {
    const rs = { topN: 10, totalClusters: 0, items: [] };
    const md = re.formatReviewSetMarkdown(rs);
    assert.ok(md.includes('No items to review'));
  });

  it('uses singular "change" for single change', () => {
    const rs = {
      topN: 1,
      totalClusters: 1,
      items: [{
        rank: 1,
        cluster: { clusterId: 'c0', label: 'btn', changeIds: ['x'] },
        priorityScore: 50
      }]
    };
    const md = re.formatReviewSetMarkdown(rs);
    assert.ok(md.includes('1 change)'));
  });
});
