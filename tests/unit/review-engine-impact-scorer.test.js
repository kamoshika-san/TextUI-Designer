/**
 * Review Engine — Impact Scorer テスト
 * T-RE2-011
 */

const assert = require('assert');

describe('review-engine: calculateImpactScore', () => {
  let re;

  before(() => {
    re = require('../../out/domain/review-engine');
  });

  function makeImpact(changeId, direct, indirect, navigation) {
    return { changeId, direct, indirect, navigation };
  }

  it('returns 0 for empty impact', () => {
    const impact = makeImpact('c0', [], [], []);
    assert.strictEqual(re.calculateImpactScore(impact), 0);
  });

  it('scores direct nodes at ×10', () => {
    const impact = makeImpact('c0', ['n1', 'n2'], [], []);
    assert.strictEqual(re.calculateImpactScore(impact), 20); // 2 × 10
  });

  it('scores indirect nodes at ×3', () => {
    const impact = makeImpact('c0', [], ['n1', 'n2', 'n3'], []);
    assert.strictEqual(re.calculateImpactScore(impact), 9); // 3 × 3
  });

  it('scores navigation nodes at ×20', () => {
    const impact = makeImpact('c0', [], [], ['screen-a']);
    assert.strictEqual(re.calculateImpactScore(impact), 20); // 1 × 20
  });

  it('caps score at 100', () => {
    // 10 direct × 10 = 100 → capped
    const direct = Array.from({ length: 15 }, (_, i) => `n${i}`);
    const impact = makeImpact('c0', direct, [], []);
    assert.strictEqual(re.calculateImpactScore(impact), 100);
  });

  it('combines all three components', () => {
    const impact = makeImpact('c0', ['n1'], ['n2'], ['screen-a']);
    // 1×10 + 1×3 + 1×20 = 33
    assert.strictEqual(re.calculateImpactScore(impact), 33);
  });

  it('respects custom weights', () => {
    const impact = makeImpact('c0', ['n1'], [], []);
    assert.strictEqual(re.calculateImpactScore(impact, { direct: 5 }), 5);
  });

  it('higher direct count produces higher score', () => {
    const low  = makeImpact('c0', ['n1'], [], []);
    const high = makeImpact('c1', ['n1', 'n2', 'n3'], [], []);
    assert.ok(re.calculateImpactScore(high) > re.calculateImpactScore(low));
  });
});

describe('review-engine: buildImpactScoreMap', () => {
  let re;

  before(() => {
    re = require('../../out/domain/review-engine');
  });

  it('returns a map with one entry per impact', () => {
    const impacts = [
      { changeId: 'c0', direct: ['n1'], indirect: [], navigation: [] },
      { changeId: 'c1', direct: [],     indirect: [], navigation: [] }
    ];
    const map = re.buildImpactScoreMap(impacts);
    assert.strictEqual(map.size, 2);
    assert.strictEqual(map.get('c0'), 10);
    assert.strictEqual(map.get('c1'), 0);
  });
});
