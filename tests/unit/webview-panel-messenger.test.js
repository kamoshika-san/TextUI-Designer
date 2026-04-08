const assert = require('assert');

describe('WebViewPanelMessenger', () => {
  it('posts structured panel messages only when a panel exists', async () => {
    const sent = [];
    const { WebViewPanelMessenger } = require('../../out/services/webview/webview-panel-messenger');
    const messenger = new WebViewPanelMessenger({
      getPanel: () => ({
        webview: {
          postMessage: (message) => {
            sent.push(message);
            return Promise.resolve(true);
          }
        }
      })
    });

    messenger.postThemeChange('dark');
    messenger.postPreviewUpdating();
    messenger.postAvailableThemes([{ label: 'default' }]);

    assert.deepStrictEqual(sent, [
      { type: 'theme-change', theme: 'dark' },
      { type: 'preview-updating' },
      { type: 'available-themes', themes: [{ label: 'default' }] }
    ]);
  });

  it('is a no-op when no panel is active', () => {
    const { WebViewPanelMessenger } = require('../../out/services/webview/webview-panel-messenger');
    const messenger = new WebViewPanelMessenger({
      getPanel: () => undefined
    });

    assert.doesNotThrow(() => messenger.postThemeVariables('--x: 1;'));
    assert.doesNotThrow(() => messenger.postPreviewSettings({
      preview: { showUpdateIndicator: true },
      jumpToDsl: { showHoverIndicator: true }
    }));
  });
});
