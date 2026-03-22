const assert = require('assert');
const { DirectWebViewUpdateQueueForTest } = require('../helpers/direct-webview-update-queue');

describe('WebViewUpdateManager', () => {
  function createLifecycleMock(hasPanel = true) {
    return {
      hasPanel: () => hasPanel,
      getPanel: () => ({
        webview: {
          postMessage: () => Promise.resolve(true)
        }
      })
    };
  }

  it('updatePreview(false) は sendYamlToWebview(false) を呼び出す', async () => {
    const { WebViewUpdateManager } = require('../../out/services/webview/webview-update-manager');
    const manager = new WebViewUpdateManager(createLifecycleMock(true), undefined, {
      updateQueueManager: new DirectWebViewUpdateQueueForTest()
    });
    const calls = [];

    manager.sendYamlToWebview = async (forceUpdate) => {
      calls.push(forceUpdate);
    };

    await manager.updatePreview(false);

    assert.deepStrictEqual(calls, [false], '通常更新ではforceUpdate=falseが伝播する');
    manager.dispose();
  });

  it('updatePreview(true) は sendYamlToWebview(true) を呼び出す', async () => {
    const { WebViewUpdateManager } = require('../../out/services/webview/webview-update-manager');
    const manager = new WebViewUpdateManager(createLifecycleMock(true));
    const calls = [];

    manager.sendYamlToWebview = async (forceUpdate) => {
      calls.push(forceUpdate);
    };

    await manager.updatePreview(true);

    assert.deepStrictEqual(calls, [true], '強制更新ではforceUpdate=trueが伝播する');
    manager.dispose();
  });

  it('setLastTuiFile(updatePreview=true) はキャッシュ活用経路で更新する', async () => {
    const { WebViewUpdateManager } = require('../../out/services/webview/webview-update-manager');
    const manager = new WebViewUpdateManager(createLifecycleMock(true), undefined, {
      updateQueueManager: new DirectWebViewUpdateQueueForTest()
    });
    const calls = [];

    manager.sendYamlToWebview = async (forceUpdate) => {
      calls.push(forceUpdate);
    };

    manager.setLastTuiFile('/tmp/first.tui.yml');
    manager.setLastTuiFile('/tmp/second.tui.yml', true);

    assert.deepStrictEqual(calls, [false], 'ファイル切替即時更新はforce=falseで呼び出される');
    manager.dispose();
  });

  it('T-210: 注入したキューの getQueueStatus がそのまま観測できる', () => {
    const { WebViewUpdateManager } = require('../../out/services/webview/webview-update-manager');
    const manager = new WebViewUpdateManager(createLifecycleMock(true), undefined, {
      updateQueueManager: new DirectWebViewUpdateQueueForTest()
    });
    const st = manager.getQueueStatus();
    assert.deepStrictEqual(st, { queueSize: 0, isProcessing: false, lastUpdateTime: 0 });
    manager.dispose();
  });
});
