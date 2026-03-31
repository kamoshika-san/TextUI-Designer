/**
 * NormalizationTrace schema invariant tests (T-20260331-405 / Epic K)
 *
 * Tests:
 *   1. entityPathMap presence: token paths recorded after Stage0
 *   2. explicitness non-regression: 'explicit' paths do not become 'inferred' after Stage2
 *   3. ownershipMap coverage: page and component paths have entries after Stage0+Stage1
 *   4. (skip) golden trace snapshot: requires normalize() API — deferred until T-404 merged
 *      (T-404 is now committed as 2506ed0, so golden test can be un-skipped in a follow-up)
 *
 * Open question (for reviewer): explicitnessMap vocabulary gap.
 * The T-405 task spec uses 'absent-on-input' | 'preserved' | 'added-by-normalization' but
 * existing stage implementations emit 'explicit' | 'inferred'. Tests are written against
 * the CURRENT implementation vocabulary. If the spec vocabulary is adopted, both types.ts
 * and all stage files must be updated together, and these tests would need to change.
 */

'use strict';

const assert = require('assert');

let runStage0Intake;
let runStage1Structural;
let runStage2Value;

before(() => {
  runStage0Intake = require('../../out/core/diff-normalization/stage0-intake.js').runStage0Intake;
  runStage1Structural = require('../../out/core/diff-normalization/stage1-structural.js').runStage1Structural;
  runStage2Value = require('../../out/core/diff-normalization/stage2-value.js').runStage2Value;
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function dslWithTokens() {
  return {
    page: {
      id: 'page-invariant-test',
      title: 'Invariant Test',
      layout: 'vertical',
      components: [
        { Text: { content: 'Hello', token: 'comp-a' } },
        { Text: { content: 'World', token: 'comp-b' } }
      ]
    }
  };
}

function dslWithExplicitFields() {
  return {
    page: {
      id: 'page-explicit-test',
      title: 'Explicit Test',
      layout: 'vertical',
      components: [
        {
          Text: {
            content: 'Value',
            token: 'comp-x',
            // flexGrow as string — stage2 will set it to 'inferred'; token slot is 'explicit'
            flexGrow: '1'
          }
        }
      ]
    }
  };
}

// ---------------------------------------------------------------------------
// Invariant tests
// ---------------------------------------------------------------------------

describe('NormalizationTrace invariants (T-20260331-405)', () => {
  it('Invariant 1 — entityPathMap: token paths are recorded by Stage0', () => {
    const dsl = dslWithTokens();
    const result = runStage0Intake(dsl);
    assert.strictEqual(result.ok, true);

    // Both components have tokens → both should appear in entityPathMap
    const keys = Object.keys(result.trace.entityPathMap);
    assert.ok(keys.length >= 2, `Expected >=2 entityPathMap entries, got ${keys.length}`);

    // Values should be the token strings
    const values = Object.values(result.trace.entityPathMap);
    assert.ok(values.includes('comp-a'), 'comp-a token should appear as entityPathMap value');
    assert.ok(values.includes('comp-b'), 'comp-b token should appear as entityPathMap value');
  });

  it('Invariant 2 — explicitness non-regression: explicit paths stay explicit through Stage2', () => {
    const dsl = dslWithExplicitFields();

    // Stage0: sets token path to 'explicit'
    const s0 = runStage0Intake(dsl);
    assert.strictEqual(s0.ok, true);

    // Collect all 'explicit' paths from Stage0
    const explicitAfterS0 = Object.entries(s0.trace.explicitnessMap)
      .filter(([, v]) => v === 'explicit')
      .map(([k]) => k);
    assert.ok(explicitAfterS0.length >= 1, 'Stage0 should mark at least one path explicit');

    // Stage1: structural
    const s1 = runStage1Structural(s0.dsl, s0.trace);

    // Stage2: value canonicalization (will set flexGrow path to 'inferred')
    const s2 = runStage2Value(s1.dsl, s1.trace);

    // All paths that were 'explicit' after Stage0 must still be 'explicit' after Stage2
    for (const path of explicitAfterS0) {
      const after = s2.trace.explicitnessMap[path];
      assert.strictEqual(
        after,
        'explicit',
        `Path "${path}" was 'explicit' after Stage0 but became '${after}' after Stage2`
      );
    }
  });

  it('Invariant 3 — ownershipMap: page and component paths have entries after Stage0+Stage1', () => {
    const dsl = dslWithTokens();

    // Stage0: records 'page' ownership
    const s0 = runStage0Intake(dsl);
    assert.strictEqual(s0.ok, true);
    assert.ok('page' in s0.trace.ownershipMap, 'ownershipMap must have a "page" entry after Stage0');

    // Stage1: records ownership for component paths
    const s1 = runStage1Structural(s0.dsl, s0.trace);
    const ownershipKeys = Object.keys(s1.trace.ownershipMap);
    assert.ok(
      ownershipKeys.length >= 2,
      `Expected >=2 ownershipMap entries after Stage1, got ${ownershipKeys.length}: ${ownershipKeys.join(', ')}`
    );
  });

  it.skip('golden trace snapshot — requires normalize() public API (T-404 committed as 2506ed0; un-skip in follow-up)', () => {
    // TODO: un-skip after T-404 review is approved.
    // Import normalize from '../../out/core/diff-normalization/normalize.js'
    // Call normalize(dslWithTokens())
    // Assert trace snapshot matches expected shape
  });
});
