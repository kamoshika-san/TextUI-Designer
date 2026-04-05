/**
 * ConflictDetector のユニットテスト — T-I01 / Epic I Slice 1
 */

const assert = require('assert');
const { describe, it } = require('mocha');

const { detectConflicts } = require('../../out/domain/diff/conflict-detector.js');

const btn = (label) => ({ Button: { label } });
const txt = (text) => ({ Text: { text } });

function makeDiff(modified = [], added = [], removed = []) {
  return {
    hasChanges: modified.length > 0 || added.length > 0 || removed.length > 0,
    changedComponents: [...modified, ...added, ...removed],
    addedComponents: added,
    removedComponents: removed,
    modifiedComponents: modified,
  };
}

describe('detectConflicts', () => {
  it('競合なし — 両側が異なるインデックスを変更', () => {
    const base = [btn('A'), btn('B'), btn('C')];
    const ours = [btn('A-mod'), btn('B'), btn('C')];
    const theirs = [btn('A'), btn('B-mod'), btn('C')];
    const oursDiff = makeDiff([0]);
    const theirsDiff = makeDiff([1]);

    const result = detectConflicts(base, ours, theirs, oursDiff, theirsDiff);

    assert.strictEqual(result.hasConflicts, false);
    assert.strictEqual(result.conflicts.length, 0);
  });

  it('競合あり — 同一インデックスを両側が変更', () => {
    const base = [btn('Original'), txt('Text')];
    const ours = [btn('Ours'), txt('Text')];
    const theirs = [btn('Theirs'), txt('Text')];
    const oursDiff = makeDiff([0]);
    const theirsDiff = makeDiff([0]);

    const result = detectConflicts(base, ours, theirs, oursDiff, theirsDiff);

    assert.strictEqual(result.hasConflicts, true);
    assert.strictEqual(result.conflicts.length, 1);
    assert.strictEqual(result.conflicts[0].index, 0);
    assert.deepStrictEqual(result.conflicts[0].base, btn('Original'));
    assert.deepStrictEqual(result.conflicts[0].ours, btn('Ours'));
    assert.deepStrictEqual(result.conflicts[0].theirs, btn('Theirs'));
  });

  it('片側のみ変更 — 競合なし', () => {
    const base = [btn('A'), btn('B')];
    const ours = [btn('A-mod'), btn('B')];
    const theirs = [btn('A'), btn('B')]; // theirs は変更なし
    const oursDiff = makeDiff([0]);
    const theirsDiff = makeDiff([]); // 変更なし

    const result = detectConflicts(base, ours, theirs, oursDiff, theirsDiff);

    assert.strictEqual(result.hasConflicts, false);
    assert.strictEqual(result.conflicts.length, 0);
  });

  it('複数インデックスで部分競合 — 競合箇所のみ返す', () => {
    const base = [btn('A'), btn('B'), btn('C')];
    const ours = [btn('A-o'), btn('B-o'), btn('C')];
    const theirs = [btn('A-t'), btn('B'), btn('C-t')];
    const oursDiff = makeDiff([0, 1]);
    const theirsDiff = makeDiff([0, 2]);

    const result = detectConflicts(base, ours, theirs, oursDiff, theirsDiff);

    assert.strictEqual(result.hasConflicts, true);
    assert.strictEqual(result.conflicts.length, 1); // インデックス0のみ競合
    assert.strictEqual(result.conflicts[0].index, 0);
  });
});
