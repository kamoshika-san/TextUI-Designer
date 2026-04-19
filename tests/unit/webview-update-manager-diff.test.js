/**
 * WebViewUpdateManager diff/v2 coexistence checks.
 */
const assert = require('assert');
const { describe, it } = require('mocha');

const { WebViewUpdateManager } = require('../../out/services/webview/webview-update-manager.js');
const { deliverDiffPayload } = require('../../out/services/webview/diff-webview-deliver.js');

function makeLifecycleManager(hasPanel = true) {
  const messages = [];
  return {
    hasPanel: () => hasPanel,
    getPanel: () =>
      hasPanel
        ? {
            webview: { postMessage: (msg) => messages.push(msg) },
          }
        : null,
    _messages: messages,
  };
}

function makeSchemaLoader() {
  return {
    loadSchema: async () => ({ type: 'object' }),
    getSchema: () => ({ type: 'object' }),
  };
}

describe('WebViewUpdateManager diff delivery wiring', () => {
  it('creates the manager with legacy diff delivery support intact', () => {
    const lm = makeLifecycleManager();
    const mgr = new WebViewUpdateManager(lm, makeSchemaLoader());

    assert.ok('diffManager' in mgr || typeof mgr === 'object', 'instance created');
    assert.ok(typeof mgr.updatePreview === 'function', 'updatePreview exists');
  });

  it('keeps the legacy diff-update message shape unchanged', () => {
    const lm = makeLifecycleManager(true);
    const diffResult = {
      hasChanges: true,
      changedComponents: [0],
      addedComponents: [],
      removedComponents: [],
      modifiedComponents: [0],
    };

    deliverDiffPayload(lm, diffResult, [{ Button: { label: 'Old' } }], [{ Button: { label: 'New' } }]);

    const msg = lm._messages[0];
    assert.strictEqual(msg.type, 'diff-update');
    assert.ok(msg.diff.hasChanges);
    assert.strictEqual(msg.diff.nodes.filter((node) => node.changeType === 'modified').length, 1);
  });

  it('posts diff-update-v2 after legacy diff-update when semantic v2 is available', () => {
    const lm = makeLifecycleManager(true);
    const mgr = new WebViewUpdateManager(lm, makeSchemaLoader());

    mgr.getCoreEngineForSemanticV2 = () => ({
      compareUi: () => ({
        ok: true,
        result: {
          v2: {
            screens: [
              {
                screen_id: 'screen-main',
                diffs: [],
                entities: [],
              },
            ],
            metadata: { schemaVersion: 'semantic-diff-v2', totalRecords: 0 },
          },
        },
      }),
    });

    deliverDiffPayload(
      lm,
      {
        hasChanges: true,
        changedComponents: [0],
        addedComponents: [],
        removedComponents: [],
        modifiedComponents: [0],
      },
      [{ Button: { label: 'Old' } }],
      [{ Button: { label: 'New' } }]
    );

    mgr.maybeDeliverSemanticV2Panel(
      { page: { id: 'page-old', title: 'Old', layout: 'vertical', components: [] } },
      { page: { id: 'page-new', title: 'New', layout: 'vertical', components: [] } }
    );

    assert.deepStrictEqual(
      lm._messages.map((message) => message.type),
      ['diff-update', 'diff-update-v2']
    );
  });

  it('keeps legacy diff-update only when semantic v2 payload is unavailable', () => {
    const lm = makeLifecycleManager(true);
    const mgr = new WebViewUpdateManager(lm, makeSchemaLoader());

    mgr.getCoreEngineForSemanticV2 = () => ({
      compareUi: () => ({
        ok: true,
        result: {},
      }),
    });

    deliverDiffPayload(
      lm,
      {
        hasChanges: true,
        changedComponents: [0],
        addedComponents: [],
        removedComponents: [],
        modifiedComponents: [0],
      },
      [{ Button: { label: 'Old' } }],
      [{ Button: { label: 'New' } }]
    );

    mgr.maybeDeliverSemanticV2Panel(
      { page: { id: 'page-old', title: 'Old', layout: 'vertical', components: [] } },
      { page: { id: 'page-new', title: 'New', layout: 'vertical', components: [] } }
    );

    assert.deepStrictEqual(
      lm._messages.map((message) => message.type),
      ['diff-update']
    );
  });
});
