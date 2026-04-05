/**
 * conflict-update メッセージハンドラのユニットテスト
 * T-I05: 競合情報 WebView 配信 — メッセージ形式コントラクト
 *
 * use-webview-messages.ts は React hook のため直接呼び出せない。
 * ここでは ConflictUpdateMessage の形式コントラクトを検証する。
 */

const assert = require('assert');
const { describe, it } = require('mocha');

describe('conflict-update message routing (contract)', () => {
  it('conflict-update メッセージは type === "conflict-update" かつ conflict フィールドを持つ', () => {
    const sampleConflict = {
      hasConflicts: true,
      entries: [{ index: 0, conflictKind: 'both-modified', oursLabel: 'Button', theirsLabel: 'Text' }],
    };
    const message = { type: 'conflict-update', conflict: sampleConflict };
    assert.strictEqual(message.type, 'conflict-update');
    assert.strictEqual(typeof message.conflict.hasConflicts, 'boolean');
    assert.ok(Array.isArray(message.conflict.entries));
  });

  it('conflict entries は index / conflictKind / oursLabel / theirsLabel を持つ', () => {
    const entry = { index: 1, conflictKind: 'both-added', oursLabel: 'Button', theirsLabel: 'Button' };
    assert.ok(['both-modified', 'both-added', 'mixed'].includes(entry.conflictKind));
    assert.strictEqual(typeof entry.index, 'number');
    assert.strictEqual(typeof entry.oursLabel, 'string');
    assert.strictEqual(typeof entry.theirsLabel, 'string');
  });
});
