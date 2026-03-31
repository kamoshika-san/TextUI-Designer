/**
 * Unit tests for the normalize degraded path and diagnostics taxonomy
 * (T-20260331-407 / Epic K)
 *
 * Tests:
 *   1. intake-invalid → classifyFailure returns 'recoverable'
 *   2. rule-conflict → classifyFailure returns 'recoverable'
 *   3. stage-error → classifyFailure returns 'non-recoverable'
 *   4. unknown → classifyFailure returns 'non-recoverable'
 *   5. toDiagnosticEntry: recoverable failure → severity 'warning'
 *   6. toDiagnosticEntry: non-recoverable failure → severity 'error'
 *   7. toDiagnosticEntry: side and message are preserved correctly
 *   8. toDiagnosticEntry: errorKind is passed through
 */

'use strict';

const assert = require('assert');

let classifyFailure;
let toDiagnosticEntry;

before(() => {
  const mod = require('../../out/core/diff-normalization/degrade-policy.js');
  classifyFailure = mod.classifyFailure;
  toDiagnosticEntry = mod.toDiagnosticEntry;
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFailure(errorKind, message = 'test error') {
  return { ok: false, errorKind, message };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('normalize degrade policy (T-20260331-407)', () => {
  describe('classifyFailure', () => {
    it('intake-invalid → recoverable', () => {
      assert.strictEqual(classifyFailure(makeFailure('intake-invalid')), 'recoverable');
    });

    it('rule-conflict → recoverable', () => {
      assert.strictEqual(classifyFailure(makeFailure('rule-conflict')), 'recoverable');
    });

    it('stage-error → non-recoverable', () => {
      assert.strictEqual(classifyFailure(makeFailure('stage-error')), 'non-recoverable');
    });

    it('unknown → non-recoverable', () => {
      assert.strictEqual(classifyFailure(makeFailure('unknown')), 'non-recoverable');
    });
  });

  describe('toDiagnosticEntry', () => {
    it('recoverable failure → severity warning', () => {
      const entry = toDiagnosticEntry(makeFailure('intake-invalid', 'missing page.id'), 'previous');
      assert.strictEqual(entry.severity, 'warning');
    });

    it('non-recoverable failure → severity error', () => {
      const entry = toDiagnosticEntry(makeFailure('stage-error', 'stage threw'), 'next');
      assert.strictEqual(entry.severity, 'error');
    });

    it('side is preserved correctly', () => {
      const prev = toDiagnosticEntry(makeFailure('intake-invalid'), 'previous');
      const next = toDiagnosticEntry(makeFailure('stage-error'), 'next');
      assert.strictEqual(prev.side, 'previous');
      assert.strictEqual(next.side, 'next');
    });

    it('message and errorKind are passed through', () => {
      const entry = toDiagnosticEntry(makeFailure('rule-conflict', 'conflicting rule xyz'), 'next');
      assert.strictEqual(entry.message, 'conflicting rule xyz');
      assert.strictEqual(entry.errorKind, 'rule-conflict');
    });
  });
});
