const assert = require('assert');

describe('WebViewUpdateManager', () => {
  const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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
    const manager = new WebViewUpdateManager(createLifecycleMock(true));
    const calls = [];

    manager.sendYamlToWebview = async (forceUpdate) => {
      calls.push(forceUpdate);
    };

    await manager.updatePreview(false);
    await wait(260);

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
    const manager = new WebViewUpdateManager(createLifecycleMock(true));
    const calls = [];

    manager.sendYamlToWebview = async (forceUpdate) => {
      calls.push(forceUpdate);
    };

    manager.setLastTuiFile('/tmp/first.tui.yml');
    manager.setLastTuiFile('/tmp/second.tui.yml', true);
    await wait(60);

    assert.deepStrictEqual(calls, [false], 'ファイル切替即時更新はforce=falseで呼び出される');
    manager.dispose();
  });
});
