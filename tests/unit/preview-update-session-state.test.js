/**
 * preview-update-session-state 純粋関数
 */
const assert = require('assert');

describe('preview-update-session-state', () => {
  it('shouldBlockYamlSend: パネル無しまたは更新中はブロック', () => {
    const { shouldBlockYamlSend } = require('../../out/services/webview/preview-update-session-state.js');
    assert.strictEqual(shouldBlockYamlSend({ hasPanel: false, isUpdating: false }), true);
    assert.strictEqual(shouldBlockYamlSend({ hasPanel: true, isUpdating: true }), true);
    assert.strictEqual(shouldBlockYamlSend({ hasPanel: true, isUpdating: false }), false);
  });
});
