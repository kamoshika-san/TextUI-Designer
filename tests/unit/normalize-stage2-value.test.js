/**
 * Unit tests for Stage2 value equivalence canonicalization (T-20260331-403).
 */

const assert = require('assert');
const { runStage2Value, STAGE2_DEFAULT_ALLOWED_RULES } = require('../../out/core/diff-normalization/stage2-value');
const { emptyTrace } = require('../../out/core/diff-normalization/types');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTrace(extra = {}) {
  return {
    ...emptyTrace(),
    appliedRules: ['stage0-intake-check', 'stage1-sort-children-by-token'],
    ...extra
  };
}

function makeDsl(components) {
  return {
    page: {
      id: 'test-page',
      title: 'Test',
      components
    }
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Stage2 value canonicalization (T-20260331-403)', () => {

  describe('Stage1 trace preservation', () => {
    it('preserves Stage0 and Stage1 appliedRules in output trace', () => {
      const dsl = makeDsl([{ Text: { text: 'Hello', token: 'tk1', variant: 'p' } }]);
      const trace = makeTrace();
      const result = runStage2Value(dsl, trace);
      assert.ok(result.trace.appliedRules.includes('stage0-intake-check'), 'stage0 rule should be preserved');
      assert.ok(result.trace.appliedRules.includes('stage1-sort-children-by-token'), 'stage1 rule should be preserved');
    });

    it('does not mutate the input trace', () => {
      const dsl = makeDsl([{ Text: { text: 'Hello', token: 'tk1', variant: 'p', flexGrow: '2' } }]);
      const trace = makeTrace();
      const originalRules = [...trace.appliedRules];
      runStage2Value(dsl, trace);
      assert.deepStrictEqual(trace.appliedRules, originalRules);
    });

    it('does not mutate the input DSL', () => {
      const comp = { Text: { text: 'Hello', flexGrow: '2', variant: 'p' } };
      const dsl = makeDsl([comp]);
      const trace = makeTrace();
      runStage2Value(dsl, trace);
      // Original still has string
      assert.strictEqual(dsl.page.components[0].Text.flexGrow, '2');
    });
  });

  describe('Rule: stage2-numeric-string-to-number', () => {
    it('coerces flexGrow string to number', () => {
      const dsl = makeDsl([{ Text: { text: 'Hello', flexGrow: '3', variant: 'p' } }]);
      const trace = makeTrace();
      const result = runStage2Value(dsl, trace);
      assert.strictEqual(result.dsl.page.components[0].Text.flexGrow, 3);
      assert.ok(result.trace.appliedRules.includes('stage2-numeric-string-to-number'));
    });

    it('records inferred explicitness for coerced field', () => {
      const dsl = makeDsl([{ Text: { text: 'Hello', flexGrow: '5', variant: 'p' } }]);
      const trace = makeTrace();
      const result = runStage2Value(dsl, trace);
      const key = 'page.components[0].flexGrow';
      assert.strictEqual(result.trace.explicitnessMap[key], 'inferred');
    });

    it('does not coerce non-numeric string', () => {
      const dsl = makeDsl([{ Text: { text: 'Hello', flexGrow: 'auto', variant: 'p' } }]);
      const trace = makeTrace();
      const result = runStage2Value(dsl, trace);
      assert.strictEqual(result.dsl.page.components[0].Text.flexGrow, 'auto');
      assert.ok(!result.trace.appliedRules.includes('stage2-numeric-string-to-number'));
    });

    it('does not coerce if field is already a number', () => {
      const dsl = makeDsl([{ Text: { text: 'Hello', flexGrow: 3, variant: 'p' } }]);
      const trace = makeTrace();
      const result = runStage2Value(dsl, trace);
      assert.strictEqual(result.dsl.page.components[0].Text.flexGrow, 3);
      // Rule should not be recorded since no coercion was needed
      assert.ok(!result.trace.appliedRules.includes('stage2-numeric-string-to-number'));
    });

    it('coerces rows field', () => {
      const dsl = makeDsl([{ TextArea: { label: 'Notes', rows: '4' } }]);
      const trace = makeTrace();
      const result = runStage2Value(dsl, trace);
      assert.strictEqual(result.dsl.page.components[0].TextArea.rows, 4);
    });
  });

  describe('Rule: stage2-trim-empty-string', () => {
    it('removes empty-string fields that are not in the never-trim list', () => {
      const dsl = makeDsl([{ Text: { text: 'Hello', variant: 'p', description: '' } }]);
      const trace = makeTrace();
      const result = runStage2Value(dsl, trace);
      assert.ok(!('description' in result.dsl.page.components[0].Text));
      assert.ok(result.trace.appliedRules.includes('stage2-trim-empty-string'));
    });

    it('does NOT remove empty-string from never-trim fields (text, label, etc.)', () => {
      const dsl = makeDsl([{ Text: { text: '', variant: 'p' } }]);
      const trace = makeTrace();
      const result = runStage2Value(dsl, trace);
      assert.strictEqual(result.dsl.page.components[0].Text.text, '');
      assert.ok(!result.trace.appliedRules.includes('stage2-trim-empty-string'));
    });

    it('does NOT remove non-empty string fields', () => {
      const dsl = makeDsl([{ Text: { text: 'Hello', variant: 'p', description: 'Some desc' } }]);
      const trace = makeTrace();
      const result = runStage2Value(dsl, trace);
      assert.strictEqual(result.dsl.page.components[0].Text.description, 'Some desc');
    });
  });

  describe('Allowlist enforcement', () => {
    it('does not apply stage2-numeric-string-to-number when not in allowedRules', () => {
      const dsl = makeDsl([{ Text: { text: 'Hello', flexGrow: '3', variant: 'p' } }]);
      const trace = makeTrace();
      const result = runStage2Value(dsl, trace, ['stage2-trim-empty-string']);
      // flexGrow should remain string
      assert.strictEqual(result.dsl.page.components[0].Text.flexGrow, '3');
      assert.ok(!result.trace.appliedRules.includes('stage2-numeric-string-to-number'));
    });

    it('does not apply stage2-trim-empty-string when not in allowedRules', () => {
      const dsl = makeDsl([{ Text: { text: 'Hello', variant: 'p', description: '' } }]);
      const trace = makeTrace();
      const result = runStage2Value(dsl, trace, ['stage2-numeric-string-to-number']);
      assert.ok('description' in result.dsl.page.components[0].Text);
      assert.ok(!result.trace.appliedRules.includes('stage2-trim-empty-string'));
    });

    it('applies no rules when allowedRules is empty array', () => {
      const dsl = makeDsl([{ Text: { text: 'Hello', flexGrow: '3', variant: 'p', description: '' } }]);
      const trace = makeTrace();
      const result = runStage2Value(dsl, trace, []);
      const stageRules = result.trace.appliedRules.filter(r => r.startsWith('stage2-'));
      assert.strictEqual(stageRules.length, 0);
      assert.strictEqual(result.dsl.page.components[0].Text.flexGrow, '3');
    });
  });

  describe('Nested components', () => {
    it('canonicalizes values in nested container components', () => {
      const dsl = makeDsl([
        {
          Container: {
            layout: 'horizontal',
            components: [
              { Text: { text: 'Col1', flexGrow: '7', variant: 'p' } },
              { Text: { text: 'Col2', flexGrow: '3', variant: 'p' } }
            ]
          }
        }
      ]);
      const trace = makeTrace();
      const result = runStage2Value(dsl, trace);
      const containerComps = result.dsl.page.components[0].Container.components;
      assert.strictEqual(containerComps[0].Text.flexGrow, 7);
      assert.strictEqual(containerComps[1].Text.flexGrow, 3);
    });
  });

  describe('STAGE2_DEFAULT_ALLOWED_RULES export', () => {
    it('exports the default allowlist', () => {
      assert.ok(Array.isArray(STAGE2_DEFAULT_ALLOWED_RULES));
      assert.ok(STAGE2_DEFAULT_ALLOWED_RULES.includes('stage2-numeric-string-to-number'));
      assert.ok(STAGE2_DEFAULT_ALLOWED_RULES.includes('stage2-trim-empty-string'));
    });
  });
});
