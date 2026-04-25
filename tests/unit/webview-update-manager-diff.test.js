/**
 * WebViewUpdateManager diff/v2 coexistence checks.
 */
const assert = require('assert');
const { describe, it } = require('mocha');

const { WebViewUpdateManager } = require('../../out/services/webview/webview-update-manager.js');
const { deliverDiffPayload } = require('../../out/services/webview/diff-webview-deliver.js');
const { DirectWebViewUpdateQueueForTest } = require('../helpers/direct-webview-update-queue.js');

function makeLifecycleManager(hasPanel = true) {
  const messages = [];
  return {
    hasPanel: () => hasPanel,
    getPanel: () =>
      hasPanel
        ? {
            webview: {
              postMessage: (msg) => messages.push(msg),
              asWebviewUri: (uri) => uri,
            },
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

function makeDsl(pageId, title, components = []) {
  return {
    page: {
      id: pageId,
      title,
      layout: 'vertical',
      components,
    },
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

  it('posts diff-update-v2 after legacy diff-update when semantic v2 is subscribed and available', () => {
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

    mgr.setSemanticV2Subscription(true);

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

  it('keeps legacy diff-update only when semantic v2 payload is unavailable (subscribed)', () => {
    const lm = makeLifecycleManager(true);
    const mgr = new WebViewUpdateManager(lm, makeSchemaLoader());

    mgr.getCoreEngineForSemanticV2 = () => ({
      compareUi: () => ({
        ok: true,
        result: {},
      }),
    });

    mgr.setSemanticV2Subscription(true);

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

  it('delivers diff-update-v2 through compareUi wiring after preview diff delivery (subscribed)', async () => {
    const lm = makeLifecycleManager(true);
    const mgr = new WebViewUpdateManager(lm, makeSchemaLoader(), {
      updateQueueManager: new DirectWebViewUpdateQueueForTest(),
    });
    const previousDsl = makeDsl('account', 'Account', []);
    const nextDsl = makeDsl('account', 'Account', [{ Text: { value: 'Profile', variant: 'p' } }]);

    mgr.diffManager.computeDiff(previousDsl);
    mgr.lastDeliveredDsl = previousDsl;
    mgr.yamlSourceResolver.resolveCurrentYamlForCache = async () => null;
    mgr.yamlParser.parseYamlFile = async () => ({
      fileName: 'C:/tmp/account.tui.yml',
      content: 'page: {}',
      data: nextDsl,
    });
    mgr.setSemanticV2Subscription(true);

    await mgr.sendYamlToWebview(true);

    assert.deepStrictEqual(
      lm._messages.map((message) => message.type),
      ['update', 'diff-update', 'diff-update-v2']
    );
    assert.ok(lm._messages[2].payload);
    assert.ok(Array.isArray(lm._messages[2].payload.screens));
    assert.strictEqual(lm._messages[2].payload.screens.length, 1);
  });

  describe('Wave 3 lazy-load contract', () => {
    function makeV2CapableEngine() {
      return () => ({
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
    }

    it('does not push diff-update-v2 when subscription is off (default)', () => {
      const lm = makeLifecycleManager(true);
      const mgr = new WebViewUpdateManager(lm, makeSchemaLoader());
      mgr.getCoreEngineForSemanticV2 = makeV2CapableEngine();

      mgr.maybeDeliverSemanticV2Panel(
        { page: { id: 'p', title: 'A', layout: 'vertical', components: [] } },
        { page: { id: 'p', title: 'B', layout: 'vertical', components: [] } }
      );

      assert.deepStrictEqual(lm._messages.map((m) => m.type), []);
      assert.strictEqual(mgr.isSemanticV2Subscribed(), false);
    });

    it('caches v2 result even when subscription is off, so resubscribe can replay', () => {
      const lm = makeLifecycleManager(true);
      const mgr = new WebViewUpdateManager(lm, makeSchemaLoader());
      mgr.getCoreEngineForSemanticV2 = makeV2CapableEngine();

      mgr.maybeDeliverSemanticV2Panel(
        { page: { id: 'p', title: 'A', layout: 'vertical', components: [] } },
        { page: { id: 'p', title: 'B', layout: 'vertical', components: [] } }
      );
      assert.deepStrictEqual(lm._messages.map((m) => m.type), []);

      const cached = mgr.getLastSemanticV2ResultForTest();
      assert.ok(cached, 'v2 result is cached');
      assert.ok(cached.payload);
      assert.strictEqual(cached.payload.screens.length, 1);
    });

    it('replays cached v2 immediately on subscribe', () => {
      const lm = makeLifecycleManager(true);
      const mgr = new WebViewUpdateManager(lm, makeSchemaLoader());
      mgr.getCoreEngineForSemanticV2 = makeV2CapableEngine();

      mgr.maybeDeliverSemanticV2Panel(
        { page: { id: 'p', title: 'A', layout: 'vertical', components: [] } },
        { page: { id: 'p', title: 'B', layout: 'vertical', components: [] } }
      );
      assert.deepStrictEqual(lm._messages.map((m) => m.type), []);

      mgr.setSemanticV2Subscription(true);

      assert.deepStrictEqual(lm._messages.map((m) => m.type), ['diff-update-v2']);
    });

    it('subscribe with no cache and no prior DSL is a no-op', () => {
      const lm = makeLifecycleManager(true);
      const mgr = new WebViewUpdateManager(lm, makeSchemaLoader());

      mgr.setSemanticV2Subscription(true);

      assert.deepStrictEqual(lm._messages.map((m) => m.type), []);
      assert.strictEqual(mgr.isSemanticV2Subscribed(), true);
    });

    it('cancel stops subsequent auto-pushes but keeps the cached v2', () => {
      const lm = makeLifecycleManager(true);
      const mgr = new WebViewUpdateManager(lm, makeSchemaLoader());
      mgr.getCoreEngineForSemanticV2 = makeV2CapableEngine();

      mgr.setSemanticV2Subscription(true);
      mgr.maybeDeliverSemanticV2Panel(
        { page: { id: 'p', title: 'A', layout: 'vertical', components: [] } },
        { page: { id: 'p', title: 'B', layout: 'vertical', components: [] } }
      );
      assert.deepStrictEqual(lm._messages.map((m) => m.type), ['diff-update-v2']);

      mgr.setSemanticV2Subscription(false);
      assert.strictEqual(mgr.isSemanticV2Subscribed(), false);

      mgr.maybeDeliverSemanticV2Panel(
        { page: { id: 'p', title: 'B', layout: 'vertical', components: [] } },
        { page: { id: 'p', title: 'C', layout: 'vertical', components: [] } }
      );

      // Still only the original push; cancel suppresses additional auto-push.
      assert.deepStrictEqual(lm._messages.map((m) => m.type), ['diff-update-v2']);
      // Cache reflects the latest computation.
      assert.ok(mgr.getLastSemanticV2ResultForTest());
    });
  });

  it('keeps legacy diff-update as the only diff message when there is no previous DSL for v2 compareUi', async () => {
    const lm = makeLifecycleManager(true);
    const mgr = new WebViewUpdateManager(lm, makeSchemaLoader(), {
      updateQueueManager: new DirectWebViewUpdateQueueForTest(),
    });
    const previousDsl = makeDsl('account', 'Account', []);
    const nextDsl = makeDsl('account', 'Account', [{ Text: { value: 'Profile', variant: 'p' } }]);

    mgr.diffManager.computeDiff(previousDsl);
    mgr.lastDeliveredDsl = null;
    mgr.yamlSourceResolver.resolveCurrentYamlForCache = async () => null;
    mgr.yamlParser.parseYamlFile = async () => ({
      fileName: 'C:/tmp/account.tui.yml',
      content: 'page: {}',
      data: nextDsl,
    });

    await mgr.sendYamlToWebview(true);

    assert.deepStrictEqual(
      lm._messages.map((message) => message.type),
      ['update', 'diff-update']
    );
  });
});
