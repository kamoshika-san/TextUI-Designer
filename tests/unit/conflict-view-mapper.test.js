/**
 * conflict-view-mapper のユニットテスト — T-I04 / Epic I Slice 3
 */

const assert = require('assert');
const { describe, it } = require('mocha');

const { toConflictView } = require('../../out/services/diff/conflict-view-mapper.js');

const btn = (label) => ({ Button: { label } });
const txt = (text) => ({ Text: { text } });

function makeConflictResult(conflicts) {
  return {
    conflicts,
    hasConflicts: conflicts.length > 0,
  };
}

describe('toConflictView', () => {
  it('競合なし — 空の entries を返す', () => {
    const result = toConflictView(makeConflictResult([]));
    assert.strictEqual(result.hasConflicts, false);
    assert.strictEqual(result.entries.length, 0);
  });

  it('both-modified — index・conflictKind・ラベルを正しくマップ', () => {
    const conflict = {
      index: 0,
      base: btn('Original'),
      ours: btn('Ours'),
      theirs: btn('Theirs'),
      conflictKind: 'both-modified',
    };
    const result = toConflictView(makeConflictResult([conflict]));

    assert.strictEqual(result.hasConflicts, true);
    assert.strictEqual(result.entries.length, 1);
    assert.strictEqual(result.entries[0].index, 0);
    assert.strictEqual(result.entries[0].conflictKind, 'both-modified');
    assert.strictEqual(result.entries[0].oursLabel, 'Button');
    assert.strictEqual(result.entries[0].theirsLabel, 'Button');
  });

  it('both-added — 異なるコンポーネント種別のラベルを返す', () => {
    const conflict = {
      index: 1,
      base: btn('dummy'),
      ours: btn('Ours-New'),
      theirs: txt('Theirs-New'),
      conflictKind: 'both-added',
    };
    const result = toConflictView(makeConflictResult([conflict]));

    assert.strictEqual(result.entries[0].conflictKind, 'both-added');
    assert.strictEqual(result.entries[0].oursLabel, 'Button');
    assert.strictEqual(result.entries[0].theirsLabel, 'Text');
  });

  it('mixed — one modified / one added のラベルを返す', () => {
    const conflict = {
      index: 2,
      base: txt('Base'),
      ours: btn('Ours-Mod'),
      theirs: txt('Theirs-Added'),
      conflictKind: 'mixed',
    };
    const result = toConflictView(makeConflictResult([conflict]));

    assert.strictEqual(result.entries[0].conflictKind, 'mixed');
    assert.strictEqual(result.entries[0].oursLabel, 'Button');
    assert.strictEqual(result.entries[0].theirsLabel, 'Text');
  });
});
