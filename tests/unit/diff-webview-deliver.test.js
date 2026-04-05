/**
 * diff-webview-deliver のユニットテスト
 * T-F02: WebView Diff ペイロード配信
 */

const assert = require('assert');
const { describe, it } = require('mocha');

const { deliverDiffPayload } = require('../../out/services/webview/diff-webview-deliver.js');

// Tagged-object ComponentDef helpers
const btn = (label) => ({ Button: { label } });
const txt = (text) => ({ Text: { text } });

function makeLifecycleManager(panel) {
  return { getPanel: () => panel };
}

function makeMockPanel() {
  const calls = [];
  return {
    webview: {
      postMessage: (msg) => calls.push(msg),
    },
    _calls: calls,
  };
}

describe('deliverDiffPayload', () => {
  it('パネルが null のとき postMessage を呼ばない', () => {
    const lm = makeLifecycleManager(null);
    const diffResult = { hasChanges: false, changedComponents: [], addedComponents: [], removedComponents: [], modifiedComponents: [] };
    // should not throw
    deliverDiffPayload(lm, diffResult, [], []);
  });

  it('変更なし — type: diff-update, hasChanges: false で postMessage される', () => {
    const panel = makeMockPanel();
    const lm = makeLifecycleManager(panel);
    const comps = [btn('OK')];
    const diffResult = {
      hasChanges: false,
      changedComponents: [],
      addedComponents: [],
      removedComponents: [],
      modifiedComponents: [],
    };

    deliverDiffPayload(lm, diffResult, comps, comps);

    assert.strictEqual(panel._calls.length, 1);
    const msg = panel._calls[0];
    assert.strictEqual(msg.type, 'diff-update');
    assert.strictEqual(msg.diff.hasChanges, false);
    assert.strictEqual(msg.diff.nodes.length, 1);
    assert.strictEqual(msg.diff.nodes[0].changeType, 'unchanged');
  });

  it('added コンポーネントあり — hasChanges: true で postMessage される', () => {
    const panel = makeMockPanel();
    const lm = makeLifecycleManager(panel);
    const oldComps = [btn('OK')];
    const newComps = [btn('OK'), txt('New')];
    const diffResult = {
      hasChanges: true,
      changedComponents: [1],
      addedComponents: [1],
      removedComponents: [],
      modifiedComponents: [],
    };

    deliverDiffPayload(lm, diffResult, oldComps, newComps);

    const msg = panel._calls[0];
    assert.strictEqual(msg.type, 'diff-update');
    assert.strictEqual(msg.diff.hasChanges, true);
    const addedNodes = msg.diff.nodes.filter(n => n.changeType === 'added');
    assert.strictEqual(addedNodes.length, 1);
    assert.strictEqual(addedNodes[0].kind, 'Text');
  });

  it('メッセージ shape が { type, diff: { nodes, hasChanges } } を持つ', () => {
    const panel = makeMockPanel();
    const lm = makeLifecycleManager(panel);
    deliverDiffPayload(lm,
      { hasChanges: false, changedComponents: [], addedComponents: [], removedComponents: [], modifiedComponents: [] },
      [], []
    );
    const msg = panel._calls[0];
    assert.ok('type' in msg);
    assert.ok('diff' in msg);
    assert.ok('nodes' in msg.diff);
    assert.ok('hasChanges' in msg.diff);
  });
});
