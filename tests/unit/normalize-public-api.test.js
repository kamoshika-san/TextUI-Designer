/**
 * Unit tests for the public normalize() API (T-20260331-404 / Epic K)
 *
 * Tests:
 *   1. Valid DSL → ok: true, trace includes all four stage rules
 *   2. Stage0 failure (missing page.id) → ok: false, errorKind: 'intake-invalid'
 *   3. opts.allowedRules passed to Stage1/Stage2 but not Stage0/Stage3
 *   4. Partial trace is included on Stage0 failure (not undefined)
 *   5. opts.allowedRules empty array suppresses optional stage rules but Stage3 still runs
 */

'use strict';

const assert = require('assert');

let normalize;

before(() => {
  const mod = require('../../out/core/diff-normalization/normalize.js');
  normalize = mod.normalize;
});

// ---------------------------------------------------------------------------
// Helper factories
// ---------------------------------------------------------------------------

function validDsl() {
  // Two components with tokens in reverse alphabetical order so stage1-sort-children-by-token
  // actually reorders them and appends its rule ID to appliedRules.
  // Also includes a numeric string field so stage2-numeric-string-to-number fires.
  return {
    page: {
      id: 'page-test',
      title: 'Test Page',
      layout: 'vertical',
      components: [
        { Text: { content: 'World', token: 'text-z' } },
        { Text: { content: 'Hello', token: 'text-a', flexGrow: '1' } }
      ]
    }
  };
}

function dslMissingPageId() {
  return {
    page: {
      title: 'No ID Page',
      layout: 'vertical',
      components: []
    }
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('normalize() public API', () => {
  it('valid DSL → ok:true, trace has all four stage rules', () => {
    const result = normalize(validDsl());
    assert.strictEqual(result.ok, true);
    assert.ok(result.trace, 'trace must be present');
    assert.ok(
      result.trace.appliedRules.includes('stage0-intake-check'),
      'expected stage0-intake-check in appliedRules'
    );
    assert.ok(
      result.trace.appliedRules.some(r => r.startsWith('stage1-')),
      'expected at least one stage1 rule in appliedRules'
    );
    assert.ok(
      result.trace.appliedRules.some(r => r.startsWith('stage2-')),
      'expected at least one stage2 rule in appliedRules'
    );
    assert.ok(
      result.trace.appliedRules.includes('stage3-finalize'),
      'expected stage3-finalize in appliedRules'
    );
  });

  it('DSL missing page.id → ok:false, errorKind: intake-invalid', () => {
    const result = normalize(dslMissingPageId());
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.errorKind, 'intake-invalid');
  });

  it('Stage0 failure includes partial trace (not undefined)', () => {
    const result = normalize(dslMissingPageId());
    assert.strictEqual(result.ok, false);
    assert.ok(result.trace !== undefined, 'partial trace must be present on failure');
  });

  it('valid DSL → returned dsl preserves page.id and component count', () => {
    const dsl = validDsl();
    const result = normalize(dsl);
    assert.strictEqual(result.ok, true);
    // page.id must be preserved
    assert.strictEqual(result.dsl.page.id, dsl.page.id);
    // component count must be preserved
    assert.strictEqual(result.dsl.page.components.length, dsl.page.components.length);
  });

  it('opts.allowedRules = [] suppresses optional stage rules but stage3-finalize still runs', () => {
    const result = normalize(validDsl(), { allowedRules: [] });
    assert.strictEqual(result.ok, true);
    // Stage0 always runs
    assert.ok(result.trace.appliedRules.includes('stage0-intake-check'));
    // Stage3 always runs
    assert.ok(result.trace.appliedRules.includes('stage3-finalize'));
    // No optional stage1 or stage2 rules (sort rules etc)
    const optionalRules = result.trace.appliedRules.filter(
      r => r.startsWith('stage1-sort') || r.startsWith('stage2-numeric') || r.startsWith('stage2-trim')
    );
    assert.strictEqual(optionalRules.length, 0, 'no optional rules should run when allowedRules is empty');
  });
});
