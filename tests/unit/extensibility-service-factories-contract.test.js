const assert = require('assert');

function createSchemaManagerMock() {
  return {
    initializeCalled: 0,
    cleanupCalled: 0,
    async initialize() {
      this.initializeCalled += 1;
    },
    async cleanup() {
      this.cleanupCalled += 1;
    },
    async reinitialize() {},
    async debugSchemas() {},
    async loadSchema() {
      return { type: 'object' };
    },
    async loadTemplateSchema() {
      return { type: 'object' };
    },
    async loadThemeSchema() {
      return { type: 'object' };
    },
    validateSchema() {
      return { valid: true };
    },
    async registerSchema() {},
    async unregisterSchema() {}
  };
}

function createThemeManagerMock() {
  return {
    loadThemeCalled: 0,
    watchThemeFileCalled: 0,
    disposeCalled: 0,
    async loadTheme() {
      this.loadThemeCalled += 1;
    },
    generateCSSVariables() {
      return ':root { --x: 1; }';
    },
    watchThemeFile(callback) {
      this.watchThemeFileCalled += 1;
      this.watchCallback = callback;
    },
    getThemePath() {
      return undefined;
    },
    setThemePath() {},
    dispose() {
      this.disposeCalled += 1;
    }
  };
}

function createWebViewManagerMock() {
  return {
    appliedCss: [],
    disposeCalled: 0,
    async openPreview() {},
    async updatePreview() {},
    closePreview() {},
    setLastTuiFile() {},
    getLastTuiFile() {
      return undefined;
    },
    applyThemeVariables(css) {
      this.appliedCss.push(css);
    },
    notifyThemeChange() {},
    dispose() {
      this.disposeCalled += 1;
    },
    hasPanel() {
      return false;
    },
    getPanel() {
      return undefined;
    },
    openDevTools() {}
  };
}

function createDiagnosticManagerMock() {
  return {
    clearCacheCalled: 0,
    disposeCalled: 0,
    clearCache() {
      this.clearCacheCalled += 1;
    },
    dispose() {
      this.disposeCalled += 1;
    }
  };
}

function createCompletionProviderMock() {
  return {
    // この契約テストでは初期化/破棄以外の振る舞いは検証対象外
    mockCompletionProvider: true
  };
}

function createCommandManagerMock() {
  return {
    registerCommandsCalled: 0,
    disposeCalled: 0,
    registerCommands() {
      this.registerCommandsCalled += 1;
    },
    dispose() {
      this.disposeCalled += 1;
    }
  };
}

describe('拡張API契約: ServiceFactoryOverrides', () => {
  let ServiceInitializer;

  before(() => {
    ({ ServiceInitializer } = require('../../out/services/service-initializer'));
  });

  it('Theme/Template/Settings のファクトリー差し替えを尊重する', async () => {
    const context = {
      subscriptions: [],
      extensionPath: process.cwd()
    };

    const schemaManager = createSchemaManagerMock();
    const themeManager = createThemeManagerMock();
    const webViewManager = createWebViewManagerMock();
    const diagnosticManager = createDiagnosticManagerMock();
    const completionProvider = createCompletionProviderMock();
    const commandManager = createCommandManagerMock();

    const templateService = {
      async createTemplate() {},
      async insertTemplate() {}
    };

    const settingsService = {
      async openSettings() {},
      async resetSettings() {},
      async showSettings() {},
      async showAutoPreviewSetting() {},
      startWatching: () => ({ dispose() {} }),
      hasConfigurationChanged: () => true
    };

    const exportManager = {
      registerExporter() {},
      unregisterExporter() {
        return false;
      },
      async exportFromFile() {
        return '';
      },
      getSupportedFormats() {
        return [];
      },
      getFileExtension() {
        return '';
      },
      clearCache() {},
      clearFormatCache() {},
      dispose() {}
    };

    const initializer = new ServiceInitializer(context, {
      createSchemaManager: () => schemaManager,
      createThemeManager: () => themeManager,
      createWebViewManager: () => webViewManager,
      createExportManager: () => exportManager,
      createTemplateService: () => templateService,
      createSettingsService: () => settingsService,
      createDiagnosticManager: () => diagnosticManager,
      createCompletionProvider: () => completionProvider,
      createCommandManager: () => commandManager
    });

    const services = await initializer.initialize();

    assert.strictEqual(services.themeManager, themeManager);
    assert.strictEqual(services.templateService, templateService);
    assert.strictEqual(services.settingsService, settingsService);
    assert.strictEqual(services.diagnosticManager, diagnosticManager);
    assert.strictEqual(services.completionProvider, completionProvider);
    assert.strictEqual(services.commandManager, commandManager);

    assert.strictEqual(commandManager.registerCommandsCalled, 1);

    assert.strictEqual(schemaManager.initializeCalled, 1);
    assert.strictEqual(themeManager.loadThemeCalled, 1);
    // watchThemeFile はプレビュー初回（webview-ready）まで遅延（T-305）
    assert.strictEqual(themeManager.watchThemeFileCalled, 0);
    assert.deepStrictEqual(webViewManager.appliedCss, [':root { --x: 1; }']);

    await initializer.cleanup();

    assert.strictEqual(schemaManager.cleanupCalled, 1);
    assert.strictEqual(diagnosticManager.clearCacheCalled, 1);
    assert.strictEqual(diagnosticManager.disposeCalled, 1);
    assert.strictEqual(commandManager.disposeCalled, 1);
    assert.strictEqual(webViewManager.disposeCalled, 1);
    assert.strictEqual(themeManager.disposeCalled, 1);
  });
});
