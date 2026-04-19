/**
 * diff-update-v2 postMessage 組み立て（Wave 2）
 */
const assert = require('assert');
const { describe, it } = require('mocha');

const { buildDiffUpdateV2PostMessage } = require('../../out/services/webview/diff-webview-deliver.js');

describe('buildDiffUpdateV2PostMessage', () => {
  it('Wave 0 契約: type / schemaVersion / payload', () => {
    const result = {
      hasChanges: false,
      payload: { screens: [] },
    };
    const msg = buildDiffUpdateV2PostMessage(result);
    assert.strictEqual(msg.type, 'diff-update-v2');
    assert.strictEqual(msg.schemaVersion, 1);
    assert.strictEqual(msg.payload, result.payload);
  });
});
