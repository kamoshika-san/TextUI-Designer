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
    assert.strictEqual(ssot.cssMetrics.nonExemptInlineUtilityClassOccurrences, 6);
    assert.strictEqual(ssot.cssMetrics.fallbackCompatibilitySelectorCount, 24);
    assert.strictEqual(ssot.status, 'pass');
  });

  it('limits inline utility counting to the approved target components', () => {
    const result = collectInlineUtilityClassOccurrences();
    const files = new Set(
      result.matches.map((entry) => entry.split(':')[0].split('/').pop())
    );

    assert.deepStrictEqual(
      [...files].sort(),
      ['Checkbox.tsx', 'Form.tsx', 'Input.tsx', 'Radio.tsx']
    );
  });

  it('counts selectors inside the append-only fallback compatibility block', () => {
    const result = collectFallbackCompatibilitySelectorCount();

    assert.strictEqual(result.count, 24);
    assert.ok(result.matches.includes('.textui-badge'));
    assert.ok(result.matches.includes('.textui-tabs .flex > button.textui-tab-active'));
    assert.ok(result.matches.includes('.textui-progress-error'));
  });
});
