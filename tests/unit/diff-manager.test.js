/**
 * DiffManagerの基本テスト
 */

const assert = require('assert');
const { describe, it, beforeEach } = require('mocha');

const DiffManager = require('../../dist/utils/diff-manager.js').DiffManager;

describe('DiffManager', () => {
  let diffManager;

  beforeEach(() => {
    diffManager = new DiffManager();
    diffManager.reset();
  });

  it('同一オブジェクトで差分が空になる', () => {
    const dsl = {
      page: {
        components: [
          { type: 'Text', value: 'A' },
          { type: 'Button', label: 'B' }
        ]
      }
    };
    // 初回は差分なし
    let diff = diffManager.computeDiff(dsl);
    assert.strictEqual(diff.hasChanges, false);
    assert.deepStrictEqual(diff.changedComponents, []);
    // 2回目も同じDSLなら差分なし
    diff = diffManager.computeDiff(dsl);
    assert.strictEqual(diff.hasChanges, false);
    assert.deepStrictEqual(diff.changedComponents, []);
  });

  it('2つの異なるオブジェクトで差分が正しく検出される', () => {
    const dsl1 = {
      page: {
        components: [
          { type: 'Text', value: 'A' },
          { type: 'Button', label: 'B' }
        ]
      }
    };
    const dsl2 = {
      page: {
        components: [
          { type: 'Text', value: 'A' },
          { type: 'Button', label: 'C' }, // labelが変更
          { type: 'Input', placeholder: 'D' } // 追加
        ]
      }
    };
    // まずdsl1で初期化
    diffManager.computeDiff(dsl1);
    // dsl2で差分を計算
    const diff = diffManager.computeDiff(dsl2);
    assert.strictEqual(diff.hasChanges, true);
    // 1番目（label変更）と2番目（追加）が変更
    assert.deepStrictEqual(diff.changedComponents, [1,2]);
    assert.deepStrictEqual(diff.modifiedComponents, [1]);
    assert.deepStrictEqual(diff.addedComponents, [2]);
    assert.deepStrictEqual(diff.removedComponents, []);
  });
}); 