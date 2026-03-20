const assert = require('assert');
const {
  shouldSkipDocumentChangeAfterSave,
  shouldSkipDocumentChangeWhileSaving,
  shouldThrottleByChangeCount,
  shouldThrottleByMinInterval,
  isDocumentOversized,
  POST_SAVE_DOCUMENT_CHANGE_SKIP_MS,
  MAX_CHANGES_PER_SECOND,
  MIN_CHANGE_INTERVAL_MS,
  MAX_DOCUMENT_BYTES
} = require('../../out/services/file-watcher/file-watcher-timing.js');

describe('file-watcher-timing', () => {
  it('保存直後 POST_SAVE 未満はドキュメント変更経路をスキップする', () => {
    const lastSave = 1000;
    const now = lastSave + POST_SAVE_DOCUMENT_CHANGE_SKIP_MS - 1;
    assert.strictEqual(shouldSkipDocumentChangeAfterSave(now, lastSave), true);
    assert.strictEqual(shouldSkipDocumentChangeAfterSave(lastSave + POST_SAVE_DOCUMENT_CHANGE_SKIP_MS, lastSave), false);
  });

  it('isSaving 中はドキュメント変更経路をスキップする', () => {
    assert.strictEqual(shouldSkipDocumentChangeWhileSaving(true), true);
    assert.strictEqual(shouldSkipDocumentChangeWhileSaving(false), false);
  });

  it('変更回数が MAX を超えたらスロットルする', () => {
    assert.strictEqual(shouldThrottleByChangeCount(MAX_CHANGES_PER_SECOND + 1, MAX_CHANGES_PER_SECOND), true);
    assert.strictEqual(shouldThrottleByChangeCount(MAX_CHANGES_PER_SECOND, MAX_CHANGES_PER_SECOND), false);
  });

  it('最小変更間隔未満はスロットルする', () => {
    const lastChange = 5000;
    const now = lastChange + MIN_CHANGE_INTERVAL_MS - 1;
    assert.strictEqual(shouldThrottleByMinInterval(now, lastChange, MIN_CHANGE_INTERVAL_MS), true);
    assert.strictEqual(shouldThrottleByMinInterval(lastChange + MIN_CHANGE_INTERVAL_MS, lastChange, MIN_CHANGE_INTERVAL_MS), false);
  });

  it('ドキュメントサイズが上限超過なら oversized', () => {
    assert.strictEqual(isDocumentOversized(MAX_DOCUMENT_BYTES + 1, MAX_DOCUMENT_BYTES), true);
    assert.strictEqual(isDocumentOversized(MAX_DOCUMENT_BYTES, MAX_DOCUMENT_BYTES), false);
  });
});
