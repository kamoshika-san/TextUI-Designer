const assert = require('assert');

describe('ServiceInitializer', () => {
  it('initialize()失敗時にcleanup()を実行してサービスを解放する', async () => {
    const { ServiceInitializer } = require('../../out/services/service-initializer');

    const context = {
      subscriptions: [],
      extensionPath: __dirname,
      extensionUri: { fsPath: __dirname }
    };

    const initializer = new ServiceInitializer(context);

    let cleanupCalled = false;
    const fakeServices = {
      schemaManager: {
        cleanup: async () => {}
      },
      themeManager: {
        dispose: () => {}
      },
      webViewManager: {
        dispose: () => {}
      },
      exportManager: {},
      exportService: {},
      templateService: {},
      settingsService: {},
      diagnosticManager: {
        clearCache: () => {},
        dispose: () => {}
      },
      completionProvider: {},
      commandManager: {
        registerCommands: () => {},
        dispose: () => {}
      }
    };

    initializer.createServices = () => fakeServices;
    initializer.initializeRuntime = async () => {
      throw new Error('init failed');
    };

    const originalCleanup = initializer.cleanup.bind(initializer);
    initializer.cleanup = async () => {
      cleanupCalled = true;
      return originalCleanup();
    };

    await assert.rejects(async () => initializer.initialize(), /init failed/);
    assert.strictEqual(cleanupCalled, true, 'initialize失敗時にcleanupが呼ばれる');
    assert.strictEqual(initializer.getServices(), null, 'initialize失敗後にservicesが解放される');
  });

  it('cleanup()でWebViewManagerを含む各サービスを解放する', async () => {
    const { ServiceInitializer } = require('../../out/services/service-initializer');

    const context = {
      subscriptions: [],
      extensionPath: __dirname,
      extensionUri: { fsPath: __dirname }
    };

    const initializer = new ServiceInitializer(context);

    let schemaCleanupCalled = false;
    let diagnosticClearCalled = false;
    let diagnosticDisposeCalled = false;
    let webviewDisposeCalled = false;
    let themeDisposeCalled = false;
    let commandManagerDisposeCalled = false;

    initializer.services = {
      schemaManager: {
        cleanup: async () => {
          schemaCleanupCalled = true;
        }
      },
      themeManager: {
        dispose: () => {
          themeDisposeCalled = true;
        }
      },
      webViewManager: {
        dispose: () => {
          webviewDisposeCalled = true;
        }
      },
      exportManager: {},
      exportService: {},
      templateService: {},
      settingsService: {},
      diagnosticManager: {
        clearCache: () => {
          diagnosticClearCalled = true;
        },
        dispose: () => {
          diagnosticDisposeCalled = true;
        }
      },
      completionProvider: {},
      commandManager: {
        dispose: () => {
          commandManagerDisposeCalled = true;
        }
      }
    };

    await initializer.cleanup();

    assert.strictEqual(schemaCleanupCalled, true, 'SchemaManager.cleanup が呼ばれる');
    assert.strictEqual(diagnosticClearCalled, true, 'DiagnosticManager.clearCache が呼ばれる');
    assert.strictEqual(diagnosticDisposeCalled, true, 'DiagnosticManager.dispose が呼ばれる');
    assert.strictEqual(webviewDisposeCalled, true, 'WebViewManager.dispose が呼ばれる');
    assert.strictEqual(themeDisposeCalled, true, 'ThemeManager.dispose が呼ばれる');
    assert.strictEqual(commandManagerDisposeCalled, true, 'CommandManager.dispose が呼ばれる');
    assert.strictEqual(initializer.getServices(), null, 'cleanup後にservicesが解放される');
  });
});
