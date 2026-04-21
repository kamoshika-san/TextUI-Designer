'use strict';

const assert = require('assert');

describe('guard-normalized-to-canonical', () => {
  let normalizedGuardToCanonical;

  before(() => {
    ({ normalizedGuardToCanonical } = require('../../out/core/diff/guard-normalized-to-canonical'));
  });

  it('maps v0.1 ontology facts to eq predicates', () => {
    const out = normalizedGuardToCanonical({ op: 'eq', fact: 'entity_state', value: 'draft' });
    assert.deepStrictEqual(out, { fact: 'entity_state', op: 'eq', value: 'draft' });
  });

  it('maps exists for ontology facts', () => {
    const out = normalizedGuardToCanonical({ op: 'exists', fact: 'availability' });
    assert.deepStrictEqual(out, { fact: 'availability', op: 'exists' });
  });

  it('maps in for role with string value', () => {
    const out = normalizedGuardToCanonical({ op: 'in', fact: 'role', value: 'admin' });
    assert.deepStrictEqual(out, { fact: 'role', op: 'in', value: ['admin'] });
  });

  it('returns unresolved for DSL facts outside v0.1 ontology', () => {
    const out = normalizedGuardToCanonical({ op: 'eq', fact: 'mode', value: 'draft' });
    assert.strictEqual(out.kind, 'unresolved');
    assert.strictEqual(out.reason, 'guard_fact_not_in_v0_ontology');
    assert.deepStrictEqual(out.candidates, ['mode']);
  });

  it('passes through unresolved normalized guards', () => {
    const out = normalizedGuardToCanonical({ kind: 'unresolved', reason: 'guard_depth_exceeded' });
    assert.deepStrictEqual(out, { kind: 'unresolved', reason: 'guard_depth_exceeded' });
  });

  it('maps all_of recursively', () => {
    const out = normalizedGuardToCanonical({
      op: 'all_of',
      all_of: [
        { op: 'eq', fact: 'action', value: 'a' },
        { op: 'eq', fact: 'mode', value: 'b' },
      ],
    });
    assert.strictEqual(out.op, 'all_of');
    assert.strictEqual(out.all_of.length, 2);
    assert.deepStrictEqual(out.all_of[0], { fact: 'action', op: 'eq', value: 'a' });
    assert.strictEqual(out.all_of[1].kind, 'unresolved');
  });
});
