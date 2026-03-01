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
      createSettingsService: () => settingsService
    });

    const services = await initializer.initialize();

    assert.strictEqual(services.themeManager, themeManager);
    assert.strictEqual(services.templateService, templateService);
    assert.strictEqual(services.settingsService, settingsService);

    assert.strictEqual(schemaManager.initializeCalled, 1);
    assert.strictEqual(themeManager.loadThemeCalled, 1);
    assert.strictEqual(themeManager.watchThemeFileCalled, 1);
    assert.deepStrictEqual(webViewManager.appliedCss, [':root { --x: 1; }']);

    await initializer.cleanup();

    assert.strictEqual(schemaManager.cleanupCalled, 1);
    assert.strictEqual(webViewManager.disposeCalled, 1);
    assert.strictEqual(themeManager.disposeCalled, 1);
  });
});
