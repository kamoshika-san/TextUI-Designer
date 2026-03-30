/**
 * Unit tests for Stage1 structural canonicalization (T-20260331-402 / Epic K)
 *
 * Tests:
 *   1. Components with tokens are sorted deterministically
 *   2. Components without tokens sorted by type
 *   3. Disallowed rule is not applied (trace confirms)
 *   4. Stage0 trace is preserved in output
 *   5. Identity: already-sorted list unchanged
 *   6. Empty component list passes through unchanged
 */

'use strict';

const assert = require('assert');

let runStage1Structural;
let STAGE1_DEFAULT_ALLOWED_RULES;
let emptyTrace;

before(() => {
  const mod = require('../../out/core/diff-normalization/stage1-structural.js');
  runStage1Structural = mod.runStage1Structural;
  STAGE1_DEFAULT_ALLOWED_RULES = mod.STAGE1_DEFAULT_ALLOWED_RULES;
  const typesMod = require('../../out/core/diff-normalization/types.js');
  emptyTrace = typesMod.emptyTrace;
});

describe('Stage1 Structural Canonicalization', () => {
  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------
  function makeTrace(extra = {}) {
    return {
      entityPathMap: {},
      explicitnessMap: {},
      ownershipMap: { page: 'page-boundary' },
      appliedRules: ['stage0-intake-check'],
      warnings: [],
      ...extra
    };
  }

  function makeDsl(components) {
    return {
      page: {
        id: 'page-s1',
        title: 'Stage1 Test',
        layout: 'vertical',
        components
      }
    };
  }

  // -------------------------------------------------------------------------
  // Tests
  // -------------------------------------------------------------------------

  it('components with tokens are sorted deterministically by token', () => {
    const dsl = makeDsl([
      { Text: { content: 'Z', token: 'tok-z' } },
      { Text: { content: 'A', token: 'tok-a' } },
      { Text: { content: 'M', token: 'tok-m' } }
    ]);
    const trace = makeTrace();
    const result = runStage1Structural(dsl, trace);

    const tokens = result.dsl.page.components.map(c => c.Text && c.Text.token);
    assert.deepStrictEqual(tokens, ['tok-a', 'tok-m', 'tok-z'], 'Should be sorted by token');
    assert.ok(
      result.trace.appliedRules.includes('stage1-sort-children-by-token'),
      `appliedRules should include 'stage1-sort-children-by-token', got: ${JSON.stringify(result.trace.appliedRules)}`
    );
  });

  it('components without tokens are sorted by type name', () => {
    const dsl = makeDsl([
      { Text: { content: 'Hello' } },
      { Button: { label: 'Go' } },
      { Alert: { message: 'Note', variant: 'info' } }
    ]);
    const trace = makeTrace();
    const result = runStage1Structural(dsl, trace);

    // Alert < Button < Text alphabetically
    const types = result.dsl.page.components.map(c => Object.keys(c)[0]);
    assert.deepStrictEqual(types, ['Alert', 'Button', 'Text'], 'Should be sorted by type');
    assert.ok(
      result.trace.appliedRules.includes('stage1-sort-children-by-type-index'),
      'appliedRules should include stage1-sort-children-by-type-index'
    );
  });

  it('Stage0 appliedRules are preserved in Stage1 output trace', () => {
    const dsl = makeDsl([{ Text: { content: 'Hi', token: 'a' } }]);
    const trace = makeTrace();
    const result = runStage1Structural(dsl, trace);

    assert.ok(
      result.trace.appliedRules.includes('stage0-intake-check'),
      'Stage0 rule must remain in appliedRules after Stage1'
    );
  });

  it('Stage0 ownershipMap entries are preserved', () => {
    const dsl = makeDsl([{ Text: { content: 'Hi', token: 'a' } }]);
    const trace = makeTrace();
    const result = runStage1Structural(dsl, trace);

    assert.strictEqual(result.trace.ownershipMap['page'], 'page-boundary', 'page boundary from stage0 must be preserved');
  });

  it('already-sorted token list produces no sort rule in appliedRules', () => {
    const dsl = makeDsl([
      { Text: { content: 'A', token: 'tok-a' } },
      { Text: { content: 'M', token: 'tok-m' } },
      { Text: { content: 'Z', token: 'tok-z' } }
    ]);
    const trace = makeTrace();
    const result = runStage1Structural(dsl, trace);

    // No sort was needed, rule should NOT appear in appliedRules
    assert.ok(
      !result.trace.appliedRules.includes('stage1-sort-children-by-token'),
      'Sort rule should not be recorded when list was already sorted'
    );
    // DSL structure is preserved
    const tokens = result.dsl.page.components.map(c => c.Text.token);
    assert.deepStrictEqual(tokens, ['tok-a', 'tok-m', 'tok-z']);
  });

  it('empty component list passes through unchanged', () => {
    const dsl = makeDsl([]);
    const trace = makeTrace();
    const result = runStage1Structural(dsl, trace);

    assert.deepStrictEqual(result.dsl.page.components, []);
    // No stage1 sort rules applied to empty list
    const stage1Rules = result.trace.appliedRules.filter(r => r.startsWith('stage1-'));
    assert.strictEqual(stage1Rules.length, 0);
  });

  it('disallowed rule is not applied when allowedRules excludes it', () => {
    const dsl = makeDsl([
      { Text: { content: 'Z', token: 'tok-z' } },
      { Text: { content: 'A', token: 'tok-a' } }
    ]);
    const trace = makeTrace();
    // Only allow type-index sort, not token sort
    const result = runStage1Structural(dsl, trace, ['stage1-sort-children-by-type-index']);

    assert.ok(
      !result.trace.appliedRules.includes('stage1-sort-children-by-token'),
      'Token sort should not be applied when excluded from allowedRules'
    );
    // Order should be unchanged since both are Text type (no type-sort difference)
    const tokens = result.dsl.page.components.map(c => c.Text.token);
    assert.deepStrictEqual(tokens, ['tok-z', 'tok-a'], 'Order unchanged when token-sort not allowed');
  });

  it('passing empty allowedRules applies no stage1 rules', () => {
    const dsl = makeDsl([
      { Text: { content: 'Z', token: 'tok-z' } },
      { Text: { content: 'A', token: 'tok-a' } }
    ]);
    const trace = makeTrace();
    const result = runStage1Structural(dsl, trace, []);

    const stage1Rules = result.trace.appliedRules.filter(r => r.startsWith('stage1-'));
    assert.strictEqual(stage1Rules.length, 0, 'No stage1 rules applied with empty allowlist');
    // Order unchanged
    const tokens = result.dsl.page.components.map(c => c.Text.token);
    assert.deepStrictEqual(tokens, ['tok-z', 'tok-a']);
  });
});
