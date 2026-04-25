/**
 * Wave 3 lazy-load handshake: WebView → Extension subscription messages and
 * Extension → WebView replay-on-subscribe behavior.
 */
const assert = require('assert');
const { describe, it } = require('mocha');

const { WebViewUpdateManager } = require('../../out/services/webview/webview-update-manager.js');

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

function makeV2CapableEngine(label = 'screen-main') {
  return () => ({
    compareUi: () => ({
      ok: true,
      result: {
        v2: {
          screens: [
            {
              screen_id: label,
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

describe('semantic diff v2 — Wave 3 subscription handshake', () => {
  it('starts unsubscribed', () => {
    const lm = makeLifecycleManager(true);
    const mgr = new WebViewUpdateManager(lm, makeSchemaLoader());
    assert.strictEqual(mgr.isSemanticV2Subscribed(), false);
  });

  it('subscribe/cancel toggles the internal flag', () => {
    const lm = makeLifecycleManager(true);
    const mgr = new WebViewUpdateManager(lm, makeSchemaLoader());

    mgr.setSemanticV2Subscription(true);
    assert.strictEqual(mgr.isSemanticV2Subscribed(), true);

    mgr.setSemanticV2Subscription(false);
    assert.strictEqual(mgr.isSemanticV2Subscribed(), false);
  });

  it('subscribe with no cached v2 does not post a phantom message', () => {
    const lm = makeLifecycleManager(true);
    const mgr = new WebViewUpdateManager(lm, makeSchemaLoader());

    mgr.setSemanticV2Subscription(true);

    assert.deepStrictEqual(lm._messages, []);
  });

  it('subscribe replays the most recently cached v2 result exactly once', () => {
    const lm = makeLifecycleManager(true);
    const mgr = new WebViewUpdateManager(lm, makeSchemaLoader());
    mgr.getCoreEngineForSemanticV2 = makeV2CapableEngine('cached-screen');

    mgr.maybeDeliverSemanticV2Panel(
      { page: { id: 'p', title: 'A', layout: 'vertical', components: [] } },
      { page: { id: 'p', title: 'B', layout: 'vertical', components: [] } }
    );
    assert.strictEqual(lm._messages.length, 0);

    mgr.setSemanticV2Subscription(true);

    assert.strictEqual(lm._messages.length, 1);
    assert.strictEqual(lm._messages[0].type, 'diff-update-v2');
    assert.strictEqual(lm._messages[0].payload.screens[0].screenId, 'cached-screen');
  });

  it('does not replay on every cancel→subscribe oscillation when nothing new was computed', () => {
    const lm = makeLifecycleManager(true);
    const mgr = new WebViewUpdateManager(lm, makeSchemaLoader());
    mgr.getCoreEngineForSemanticV2 = makeV2CapableEngine();

    mgr.maybeDeliverSemanticV2Panel(
      { page: { id: 'p', title: 'A', layout: 'vertical', components: [] } },
      { page: { id: 'p', title: 'B', layout: 'vertical', components: [] } }
    );
    mgr.setSemanticV2Subscription(true);
    assert.strictEqual(lm._messages.length, 1);

    // Cancel suppresses follow-up auto-pushes but should not re-post the cached payload.
    mgr.setSemanticV2Subscription(false);
    assert.strictEqual(lm._messages.length, 1);

    // Re-subscribe: replay the same cached payload once more (deterministic re-hydration).
    mgr.setSemanticV2Subscription(true);
    assert.strictEqual(lm._messages.length, 2);
  });

  it('subscribe is a no-op when there is no panel attached', () => {
    const lm = makeLifecycleManager(false);
    const mgr = new WebViewUpdateManager(lm, makeSchemaLoader());
    mgr.getCoreEngineForSemanticV2 = makeV2CapableEngine();

    mgr.maybeDeliverSemanticV2Panel(
      { page: { id: 'p', title: 'A', layout: 'vertical', components: [] } },
      { page: { id: 'p', title: 'B', layout: 'vertical', components: [] } }
    );
    mgr.setSemanticV2Subscription(true);

    assert.deepStrictEqual(lm._messages, []);
    assert.strictEqual(mgr.isSemanticV2Subscribed(), true);
  });
});
