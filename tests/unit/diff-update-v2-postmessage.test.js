/**
 * diff-update-v2 postMessage contract checks.
 */
const assert = require('assert');
const { describe, it } = require('mocha');

const { buildDiffUpdateV2PostMessage } = require('../../out/services/webview/diff-webview-deliver.js');
const { readSemanticDiffV2ResultMessage } = require('../../out/renderer/use-webview-messages.js');

describe('diff-update-v2 message contract', () => {
  it('builds the service-side envelope with type, schemaVersion, and payload', () => {
    const result = {
      hasChanges: false,
      payload: { screens: [] },
    };

    const msg = buildDiffUpdateV2PostMessage(result);

    assert.strictEqual(msg.type, 'diff-update-v2');
    assert.strictEqual(msg.schemaVersion, 1);
    assert.strictEqual(msg.payload, result.payload);
  });

  it('parses a valid renderer-side diff-update-v2 envelope', () => {
    const payload = {
      screens: [
        {
          screenId: 'screen-main',
          diffs: [],
          entities: [
            {
              entityId: 'entity-profile',
              diffs: [],
              components: [],
            },
          ],
        },
      ],
    };

    const result = readSemanticDiffV2ResultMessage({
      type: 'diff-update-v2',
      schemaVersion: 1,
      payload,
    });

    assert.ok(result);
    assert.strictEqual(result.payload, payload);
    assert.strictEqual(result.hasChanges, false);
  });

  it('ignores invalid diff-update-v2 envelopes without affecting other message types', () => {
    assert.strictEqual(
      readSemanticDiffV2ResultMessage({
        type: 'diff-update-v2',
        schemaVersion: 2,
        payload: { screens: [] },
      }),
      null
    );

    assert.strictEqual(
      readSemanticDiffV2ResultMessage({
        type: 'diff-update-v2',
        schemaVersion: 1,
        payload: {},
      }),
      null
    );

    assert.strictEqual(
      readSemanticDiffV2ResultMessage({
        type: 'diff-update',
        diff: { hasChanges: true },
      }),
      null
    );
  });
});
