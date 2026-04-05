/**
 * Visual Diff マッパーのユニットテスト
 * T-F01: Visual Diff 表示モデル定義
 */

const assert = require('assert');
const { describe, it } = require('mocha');

const { toVisualDiff } = require('../../out/services/diff/visual-diff-mapper.js');

// ComponentDef は { Button: { label: "..." } } 形式のタグ付きオブジェクト
const btn = (label) => ({ Button: { label } });
const txt = (text) => ({ Text: { text } });

describe('toVisualDiff', () => {
  it('変更なし — 全ノードが unchanged', () => {
    const diffResult = {
      hasChanges: false,
      changedComponents: [],
      addedComponents: [],
      removedComponents: [],
      modifiedComponents: [],
    };
    const comps = [btn('OK'), txt('Hello')];
    const result = toVisualDiff(diffResult, comps, comps);

    assert.strictEqual(result.hasChanges, false);
    assert.strictEqual(result.nodes.length, 2);
    assert.ok(result.nodes.every(n => n.changeType === 'unchanged'));
  });

  it('added — 追加コンポーネントが added になる', () => {
    const diffResult = {
      hasChanges: true,
      changedComponents: [1],
      addedComponents: [1],
      removedComponents: [],
      modifiedComponents: [],
    };
    const oldComps = [btn('OK')];
    const newComps = [btn('OK'), txt('New')];
    const result = toVisualDiff(diffResult, oldComps, newComps);

    assert.strictEqual(result.hasChanges, true);
    const addedNodes = result.nodes.filter(n => n.changeType === 'added');
    assert.strictEqual(addedNodes.length, 1);
    assert.strictEqual(addedNodes[0].kind, 'Text');
    assert.strictEqual(addedNodes[0].label, 'Text: New');
  });

  it('removed — 削除コンポーネントが removed になる', () => {
    const diffResult = {
      hasChanges: true,
      changedComponents: [0],
      addedComponents: [],
      removedComponents: [0],
      modifiedComponents: [],
    };
    const oldComps = [btn('Delete Me'), txt('Keep')];
    const newComps = [txt('Keep')];
    const result = toVisualDiff(diffResult, oldComps, newComps);

    assert.strictEqual(result.hasChanges, true);
    const removedNodes = result.nodes.filter(n => n.changeType === 'removed');
    assert.strictEqual(removedNodes.length, 1);
    assert.strictEqual(removedNodes[0].kind, 'Button');
  });

  it('modified — 変更コンポーネントが modified になる', () => {
    const diffResult = {
      hasChanges: true,
      changedComponents: [0],
      addedComponents: [],
      removedComponents: [],
      modifiedComponents: [0],
    };
    const oldComps = [btn('Old')];
    const newComps = [btn('New')];
    const result = toVisualDiff(diffResult, oldComps, newComps);

    assert.strictEqual(result.hasChanges, true);
    const modifiedNodes = result.nodes.filter(n => n.changeType === 'modified');
    assert.strictEqual(modifiedNodes.length, 1);
    assert.strictEqual(modifiedNodes[0].label, 'Button: New');
  });

  it('ノードの kind と label が正しく設定される（props なし）', () => {
    const diffResult = {
      hasChanges: false,
      changedComponents: [],
      addedComponents: [],
      removedComponents: [],
      modifiedComponents: [],
    };
    const comps = [{ Divider: {} }];
    const result = toVisualDiff(diffResult, comps, comps);

    assert.strictEqual(result.nodes[0].kind, 'Divider');
    assert.strictEqual(result.nodes[0].label, 'Divider');
  });
});
