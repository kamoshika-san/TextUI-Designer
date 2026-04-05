/**
 * conflict-webview-deliver のユニットテスト
 * T-I05: 競合情報 WebView 配信
 */

const assert = require('assert');
const { describe, it } = require('mocha');

const { deliverConflictPayload } = require('../../out/services/diff/conflict-webview-deliver.js');

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

const btn = (label) => ({ Button: { label } });
const txt = (text) => ({ Text: { text } });

describe('deliverConflictPayload', () => {
  it('パネルが null のとき postMessage を呼ばない', () => {
    const lm = makeLifecycleManager(null);
    const conflictResult = { hasConflicts: false, conflicts: [] };
    // should not throw
    deliverConflictPayload(lm, conflictResult);
  });

  it('競合なし — type: conflict-update, hasConflicts: false で postMessage される', () => {
    const panel = makeMockPanel();
    const lm = makeLifecycleManager(panel);
    const conflictResult = { hasConflicts: false, conflicts: [] };

    deliverConflictPayload(lm, conflictResult);

    assert.strictEqual(panel._calls.length, 1);
    const msg = panel._calls[0];
    assert.strictEqual(msg.type, 'conflict-update');
    assert.strictEqual(msg.conflict.hasConflicts, false);
    assert.strictEqual(msg.conflict.entries.length, 0);
  });

  it('競合あり — hasConflicts: true, entries に競合情報が含まれる', () => {
    const panel = makeMockPanel();
    const lm = makeLifecycleManager(panel);
    const conflictResult = {
      hasConflicts: true,
      conflicts: [
        {
          index: 0,
          conflictKind: 'both-modified',
          ours: btn('OK'),
          theirs: txt('Hello'),
          base: btn('OK'),
        },
      ],
    };

    deliverConflictPayload(lm, conflictResult);

    assert.strictEqual(panel._calls.length, 1);
    const msg = panel._calls[0];
    assert.strictEqual(msg.type, 'conflict-update');
    assert.strictEqual(msg.conflict.hasConflicts, true);
    assert.strictEqual(msg.conflict.entries.length, 1);
    assert.strictEqual(msg.conflict.entries[0].index, 0);
    assert.strictEqual(msg.conflict.entries[0].conflictKind, 'both-modified');
    assert.strictEqual(msg.conflict.entries[0].oursLabel, 'Button');
    assert.strictEqual(msg.conflict.entries[0].theirsLabel, 'Text');
  });
});
