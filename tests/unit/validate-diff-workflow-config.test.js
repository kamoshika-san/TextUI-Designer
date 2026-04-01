/**
 * Unit tests for validateDiffWorkflowConfig() (T-20260401-008).
 *
 * Coverage:
 *   - local-only + features.prComment: true → prComment disabled + warning
 *   - local-only + features.checkRunGate: true → checkRunGate disabled + warning
 *   - pr-enabled + both features true → both pass through unchanged
 *   - ci-only + features.checkRunGate: true → passes through unchanged
 *   - ci-only + features.prComment: true → prComment disabled + warning
 *   - no warnings when config is fully valid
 */

'use strict';

const assert = require('assert');
const {
  validateDiffWorkflowConfig,
} = require('../../out/workflow/diff/config/validate-diff-workflow-config');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeConfig(axis, mode, features) {
  return {
    enablementAxis: axis,
    mode: mode ?? 'advisory',
    features: {
      prComment: features?.prComment ?? false,
      checkRunGate: features?.checkRunGate ?? false,
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('validateDiffWorkflowConfig (T-20260401-008)', () => {

  describe('Result structure', () => {
    it('returns object with enablementAxis, mode, features, warnings', () => {
      const result = validateDiffWorkflowConfig(makeConfig('local-only'));
      assert.ok('enablementAxis' in result);
      assert.ok('mode' in result);
      assert.ok('features' in result);
      assert.ok('warnings' in result);
      assert.ok(Array.isArray(result.warnings));
    });

    it('does not throw for any valid config', () => {
      assert.doesNotThrow(() => validateDiffWorkflowConfig(makeConfig('local-only', 'advisory', { prComment: false, checkRunGate: false })));
      assert.doesNotThrow(() => validateDiffWorkflowConfig(makeConfig('ci-only', 'strict', { prComment: false, checkRunGate: true })));
      assert.doesNotThrow(() => validateDiffWorkflowConfig(makeConfig('pr-enabled', 'advisory', { prComment: true, checkRunGate: true })));
    });
  });

  describe('prComment axis constraint', () => {
    it('local-only + prComment: true → prComment disabled', () => {
      const result = validateDiffWorkflowConfig(makeConfig('local-only', 'advisory', { prComment: true }));
      assert.strictEqual(result.features.prComment, false);
    });

    it('local-only + prComment: true → warning recorded', () => {
      const result = validateDiffWorkflowConfig(makeConfig('local-only', 'advisory', { prComment: true }));
      assert.ok(result.warnings.length > 0);
      assert.ok(result.warnings.some(w => w.includes('prComment')));
    });

    it('ci-only + prComment: true → prComment disabled', () => {
      const result = validateDiffWorkflowConfig(makeConfig('ci-only', 'advisory', { prComment: true }));
      assert.strictEqual(result.features.prComment, false);
    });

    it('ci-only + prComment: true → warning recorded', () => {
      const result = validateDiffWorkflowConfig(makeConfig('ci-only', 'advisory', { prComment: true }));
      assert.ok(result.warnings.some(w => w.includes('prComment')));
    });

    it('pr-enabled + prComment: true → prComment passes through', () => {
      const result = validateDiffWorkflowConfig(makeConfig('pr-enabled', 'advisory', { prComment: true }));
      assert.strictEqual(result.features.prComment, true);
    });

    it('local-only + prComment: false → no prComment warning', () => {
      const result = validateDiffWorkflowConfig(makeConfig('local-only', 'advisory', { prComment: false }));
      assert.ok(!result.warnings.some(w => w.includes('prComment')));
    });
  });

  describe('checkRunGate axis constraint', () => {
    it('local-only + checkRunGate: true → checkRunGate disabled', () => {
      const result = validateDiffWorkflowConfig(makeConfig('local-only', 'advisory', { checkRunGate: true }));
      assert.strictEqual(result.features.checkRunGate, false);
    });

    it('local-only + checkRunGate: true → warning recorded', () => {
      const result = validateDiffWorkflowConfig(makeConfig('local-only', 'advisory', { checkRunGate: true }));
      assert.ok(result.warnings.length > 0);
      assert.ok(result.warnings.some(w => w.includes('checkRunGate')));
    });

    it('ci-only + checkRunGate: true → passes through unchanged', () => {
      const result = validateDiffWorkflowConfig(makeConfig('ci-only', 'advisory', { checkRunGate: true }));
      assert.strictEqual(result.features.checkRunGate, true);
    });

    it('ci-only + checkRunGate: true → no warning', () => {
      const result = validateDiffWorkflowConfig(makeConfig('ci-only', 'advisory', { checkRunGate: true }));
      assert.ok(!result.warnings.some(w => w.includes('checkRunGate')));
    });

    it('pr-enabled + checkRunGate: true → passes through unchanged', () => {
      const result = validateDiffWorkflowConfig(makeConfig('pr-enabled', 'advisory', { checkRunGate: true }));
      assert.strictEqual(result.features.checkRunGate, true);
    });
  });

  describe('Combined feature scenarios', () => {
    it('pr-enabled + both features true → both pass through, no warnings', () => {
      const result = validateDiffWorkflowConfig(makeConfig('pr-enabled', 'advisory', { prComment: true, checkRunGate: true }));
      assert.strictEqual(result.features.prComment, true);
      assert.strictEqual(result.features.checkRunGate, true);
      assert.strictEqual(result.warnings.length, 0);
    });

    it('local-only + both features true → both disabled, two warnings', () => {
      const result = validateDiffWorkflowConfig(makeConfig('local-only', 'advisory', { prComment: true, checkRunGate: true }));
      assert.strictEqual(result.features.prComment, false);
      assert.strictEqual(result.features.checkRunGate, false);
      assert.strictEqual(result.warnings.length, 2);
    });

    it('valid config with all features false → empty warnings', () => {
      const result = validateDiffWorkflowConfig(makeConfig('local-only', 'advisory', { prComment: false, checkRunGate: false }));
      assert.strictEqual(result.warnings.length, 0);
    });
  });

  describe('Pass-through of non-feature fields', () => {
    it('enablementAxis is preserved in result', () => {
      const result = validateDiffWorkflowConfig(makeConfig('ci-only', 'strict'));
      assert.strictEqual(result.enablementAxis, 'ci-only');
    });

    it('mode is preserved in result', () => {
      const result = validateDiffWorkflowConfig(makeConfig('ci-only', 'strict'));
      assert.strictEqual(result.mode, 'strict');
    });
  });
});
