const assert = require('assert');

const {
  collectSsotMetrics,
  collectInlineUtilityClassOccurrences,
  collectFallbackCompatibilitySelectorCount,
} = require('../../scripts/collect-code-metrics.cjs');

describe('CSS SSoT metrics gate', () => {
  it('matches the approved CSS baseline snapshot', () => {
    const ssot = collectSsotMetrics();

    assert.strictEqual(ssot.cssMetrics.todoPartialCount, 0);
    assert.strictEqual(ssot.cssMetrics.nonExemptInlineUtilityClassOccurrences, 0);
    assert.strictEqual(ssot.cssMetrics.fallbackCompatibilitySelectorCount, 0);
    assert.strictEqual(ssot.status, 'pass');
  });

  it('limits inline utility counting to the approved target components', () => {
    const result = collectInlineUtilityClassOccurrences();

    assert.strictEqual(result.count, 0);
    assert.deepStrictEqual(result.matches, []);
  });

  it('counts legacy fallback compatibility selectors (removed block => 0)', () => {
    const result = collectFallbackCompatibilitySelectorCount();

    assert.strictEqual(result.count, 0);
    assert.deepStrictEqual(result.matches, []);
  });
});
