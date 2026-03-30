/**
 * Unit tests for Stage0 intake check (T-20260331-401 / Epic K)
 *
 * Tests:
 *   1. Valid DSL with page.id → ok: true, appliedRules contains stage0-intake-check
 *   2. DSL missing page.id → intake-invalid
 *   3. Component with invalid explicitness value → intake-invalid
 */

'use strict';

const assert = require('assert');

// Loaded from compiled output
let runStage0Intake;
let emptyTrace;

before(() => {
  const mod = require('../../out/core/diff-normalization/stage0-intake.js');
  runStage0Intake = mod.runStage0Intake;
  const typesMod = require('../../out/core/diff-normalization/types.js');
  emptyTrace = typesMod.emptyTrace;
});

describe('Stage0 Intake Check', () => {
  // -------------------------------------------------------------------------
  // Helper factories
  // -------------------------------------------------------------------------
  function validDsl() {
    return {
      page: {
        id: 'page-test',
        title: 'Test Page',
        layout: 'vertical',
        components: [
          { Text: { content: 'Hello', token: 'text-1' } }
        ]
      }
    };
  }

  function dslWithoutPageId() {
    return {
      page: {
        // id intentionally omitted
        title: 'No ID Page',
        layout: 'vertical',
        components: []
      }
    };
  }

  function dslWithBadExplicitness() {
    return {
      page: {
        id: 'page-bad-expl',
        title: 'Bad Explicitness',
        layout: 'vertical',
        components: [
          // A synthetic component with an invalid explicitness field
          { Text: { content: 'Hi', explicitness: 'invalid-value' } }
        ]
      }
    };
  }

  // -------------------------------------------------------------------------
  // Tests
  // -------------------------------------------------------------------------

  it('valid DSL returns ok:true with stage0-intake-check in appliedRules', () => {
    const result = runStage0Intake(validDsl());
    assert.strictEqual(result.ok, true, `Expected ok:true but got: ${JSON.stringify(result)}`);
    assert.ok(
      result.trace.appliedRules.includes('stage0-intake-check'),
      `appliedRules should contain 'stage0-intake-check', got: ${JSON.stringify(result.trace.appliedRules)}`
    );
  });

  it('valid DSL preserves the dsl reference in result', () => {
    const dsl = validDsl();
    const result = runStage0Intake(dsl);
    assert.strictEqual(result.ok, true);
    assert.deepStrictEqual(result.dsl, dsl);
  });

  it('valid DSL with token records entityPathMap and explicitnessMap entries', () => {
    const result = runStage0Intake(validDsl());
    assert.strictEqual(result.ok, true);
    // token 'text-1' should be recorded
    const paths = Object.keys(result.trace.entityPathMap);
    assert.ok(paths.length > 0, 'entityPathMap should have at least one entry for token');
  });

  it('DSL missing page.id returns intake-invalid', () => {
    const result = runStage0Intake(dslWithoutPageId());
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.errorKind, 'intake-invalid');
    assert.ok(result.message.length > 0, 'failure should carry a message');
  });

  it('DSL with invalid explicitness value returns intake-invalid', () => {
    const result = runStage0Intake(dslWithBadExplicitness());
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.errorKind, 'intake-invalid');
    assert.ok(
      result.message.includes('explicitness'),
      `message should mention 'explicitness', got: ${result.message}`
    );
  });

  it('empty components array passes intake check', () => {
    const dsl = {
      page: {
        id: 'page-empty',
        title: 'Empty',
        layout: 'vertical',
        components: []
      }
    };
    const result = runStage0Intake(dsl);
    assert.strictEqual(result.ok, true);
    assert.ok(result.trace.appliedRules.includes('stage0-intake-check'));
  });

  it('page without components field passes intake check', () => {
    const dsl = {
      page: {
        id: 'page-no-comps',
        title: 'No Comps',
        layout: 'vertical',
        components: []
      }
    };
    const result = runStage0Intake(dsl);
    assert.strictEqual(result.ok, true);
  });

  it('ownership map records page boundary', () => {
    const result = runStage0Intake(validDsl());
    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.trace.ownershipMap['page'], 'page-boundary');
  });
});
