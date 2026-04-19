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
    assert.strictEqual(ssot.cssMetrics.fallbackCompatibilitySelectorCount, 29);
    assert.strictEqual(ssot.status, 'pass');
  });

  it('limits inline utility counting to the approved target components', () => {
    const result = collectInlineUtilityClassOccurrences();

    assert.strictEqual(result.count, 0);
    assert.deepStrictEqual(result.matches, []);
  });

  it('counts selectors inside the append-only fallback compatibility block', () => {
    const result = collectFallbackCompatibilitySelectorCount();

    assert.strictEqual(result.count, 29);
    assert.ok(result.matches.includes('.textui-badge'));
    assert.ok(result.matches.includes('.textui-tabs .flex > button.textui-tab-active'));
    assert.ok(result.matches.includes('.textui-progress-error'));
    assert.ok(result.matches.includes('.textui-button'));
    assert.ok(result.matches.includes('.textui-button.primary'));
  });
});
