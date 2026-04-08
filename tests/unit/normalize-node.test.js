/**
 * Unit tests for normalizeNode and normalizeDefaults (SD007)
 * Requires: npm run compile
 */

const { describe, it } = require('mocha');
const assert = require('assert');

const { normalizeNode } = require('../../out/core/diff-normalization/normalize-node.js');
const { normalizeDefaults } = require('../../out/core/diff-normalization/normalize-defaults.js');

describe('normalizeNode', () => {
  // --- padding shorthand expansion ---

  it('padding: scalar 8 → {top:8, right:8, bottom:8, left:8}', () => {
    const result = normalizeNode({ padding: 8 });
    assert.deepStrictEqual(result.padding, { top: 8, right: 8, bottom: 8, left: 8 });
  });

  it('padding: 2-element array [8,16] → {top:8, right:16, bottom:8, left:16}', () => {
    const result = normalizeNode({ padding: [8, 16] });
    assert.deepStrictEqual(result.padding, { top: 8, right: 16, bottom: 8, left: 16 });
  });

  it('padding: 4-element array [8,16,4,12] → {top:8, right:16, bottom:4, left:12}', () => {
    const result = normalizeNode({ padding: [8, 16, 4, 12] });
    assert.deepStrictEqual(result.padding, { top: 8, right: 16, bottom: 4, left: 12 });
  });

  it('padding: object {top:8} → fills missing sides with 0', () => {
    const result = normalizeNode({ padding: { top: 8 } });
    assert.deepStrictEqual(result.padding, { top: 8, right: 0, bottom: 0, left: 0 });
  });

  it('padding: full object passthrough', () => {
    const result = normalizeNode({ padding: { top: 8, right: 16, bottom: 8, left: 16 } });
    assert.deepStrictEqual(result.padding, { top: 8, right: 16, bottom: 8, left: 16 });
  });

  // --- margin shorthand expansion ---

  it('margin: scalar 4 → {top:4, right:4, bottom:4, left:4}', () => {
    const result = normalizeNode({ margin: 4 });
    assert.deepStrictEqual(result.margin, { top: 4, right: 4, bottom: 4, left: 4 });
  });

  it('margin: 2-element array [4,8] → {top:4, right:8, bottom:4, left:8}', () => {
    const result = normalizeNode({ margin: [4, 8] });
    assert.deepStrictEqual(result.margin, { top: 4, right: 8, bottom: 4, left: 8 });
  });

  // --- gap shorthand expansion ---

  it('gap: scalar 8 → {row:8, col:8}', () => {
    const result = normalizeNode({ gap: 8 });
    assert.deepStrictEqual(result.gap, { row: 8, col: 8 });
  });

  it('gap: 2-element array [8,16] → {row:8, col:16}', () => {
    const result = normalizeNode({ gap: [8, 16] });
    assert.deepStrictEqual(result.gap, { row: 8, col: 16 });
  });

  it('gap: object {row:8} → fills missing col with 0', () => {
    const result = normalizeNode({ gap: { row: 8 } });
    assert.deepStrictEqual(result.gap, { row: 8, col: 0 });
  });

  // --- recursion ---

  it('recursion: normalizes nested object padding', () => {
    const result = normalizeNode({ style: { padding: 4 } });
    assert.deepStrictEqual(result.style.padding, { top: 4, right: 4, bottom: 4, left: 4 });
  });

  it('non-object passthrough: string unchanged', () => {
    assert.strictEqual(normalizeNode('hello'), 'hello');
  });

  it('non-object passthrough: number unchanged', () => {
    assert.strictEqual(normalizeNode(42), 42);
  });

  it('padding and margin together expand independently', () => {
    const result = normalizeNode({ padding: 8, margin: 4, label: 'OK' });
    assert.deepStrictEqual(result.padding, { top: 8, right: 8, bottom: 8, left: 8 });
    assert.deepStrictEqual(result.margin, { top: 4, right: 4, bottom: 4, left: 4 });
    assert.strictEqual(result.label, 'OK');
  });
});

describe('normalizeDefaults', () => {
  it('adds disabled: false when absent', () => {
    const result = normalizeDefaults({ label: 'OK' });
    assert.strictEqual(result.disabled, false);
  });

  it('adds required: false when absent', () => {
    const result = normalizeDefaults({ label: 'Name' });
    assert.strictEqual(result.required, false);
  });

  it('adds visible: true when absent', () => {
    const result = normalizeDefaults({ label: 'X' });
    assert.strictEqual(result.visible, true);
  });

  it('adds submit: false when absent', () => {
    const result = normalizeDefaults({ label: 'Submit' });
    assert.strictEqual(result.submit, false);
  });

  it('does not override explicit disabled: true', () => {
    const result = normalizeDefaults({ label: 'OK', disabled: true });
    assert.strictEqual(result.disabled, true);
  });

  it('does not override explicit visible: false', () => {
    const result = normalizeDefaults({ label: 'X', visible: false });
    assert.strictEqual(result.visible, false);
  });

  it('preserves all original fields', () => {
    const result = normalizeDefaults({ label: 'OK', kind: 'primary' });
    assert.strictEqual(result.label, 'OK');
    assert.strictEqual(result.kind, 'primary');
  });

  it('non-object passthrough: returns input unchanged', () => {
    assert.strictEqual(normalizeDefaults('hello'), 'hello');
    assert.strictEqual(normalizeDefaults(42), 42);
    assert.deepStrictEqual(normalizeDefaults([1, 2]), [1, 2]);
  });

  it('all four defaults filled when node is empty object', () => {
    const result = normalizeDefaults({});
    assert.strictEqual(result.disabled, false);
    assert.strictEqual(result.required, false);
    assert.strictEqual(result.visible, true);
    assert.strictEqual(result.submit, false);
  });
});
