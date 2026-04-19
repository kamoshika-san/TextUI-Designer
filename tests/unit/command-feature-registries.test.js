const assert = require('assert');
const path = require('path');

describe('command feature registries', () => {
  const registriesPath = path.resolve(__dirname, '../../out/services/command-feature-registries.js');
  const errorHandlerPath = path.resolve(__dirname, '../../out/utils/error-handler.js');
  const configManagerPath = path.resolve(__dirname, '../../out/utils/config-manager.js');

  const {
    createPreviewExportFeatureRegistry,
    createAuthoringFeatureRegistry,
    createCommandFeatureBindings
  } = require(registriesPath);
  const { ErrorHandler } = require(errorHandlerPath);
  const { ConfigManager } = require(configManagerPath);
  const originalExecuteSafely = ErrorHandler.executeSafely;
  const originalShowInfo = ErrorHandler.showInfo;
  const originalAutoPreview = ConfigManager.isAutoPreviewEnabled;

  afterEach(() => {
    ErrorHandler.executeSafely = originalExecuteSafely;
    ErrorHandler.showInfo = originalShowInfo;
    ConfigManager.isAutoPreviewEnabled = originalAutoPreview;
  });

  it('preview/export registry delegates to injected services', async () => {
    let previewCalls = 0;
    let devToolsCalls = 0;
    const exportPaths = [];
    const registry = createPreviewExportFeatureRegistry({
      webViewManager: {
        openPreview: async () => {
          previewCalls += 1;
        },
        openDevTools: () => {
          devToolsCalls += 1;
        },
        getLastTuiFile: () => '/tmp/sample.tui.yml'
      },
      exportService: {
        executeExport: async (filePath) => {
          exportPaths.push(filePath);
        }
      },
      themeManager: { getThemePath: () => undefined },
      extensionPath: path.resolve(__dirname, '..', '..'),
      logger: { info() {}, warn() {}, error() {}, debug() {} }
    });

    await registry.openPreviewWithCheck();
    registry.openDevTools();
    await registry.executeExport('/tmp/sample.tui.yml');

    assert.strictEqual(previewCalls, 1);
    assert.strictEqual(devToolsCalls, 1);
    assert.deepStrictEqual(exportPaths, ['/tmp/sample.tui.yml']);
    assert.strictEqual(typeof registry.capturePreviewImage, 'function');
  });

  it('authoring registry delegates to services and checkAutoPreviewSetting stays local', async () => {
    let infoMessage;

    ErrorHandler.executeSafely = async (fn) => {
      await fn();
      return true;
    };
    ErrorHandler.showInfo = (message) => {
      infoMessage = message;
    };
    ConfigManager.isAutoPreviewEnabled = () => true;

    const calls = [];
    const registry = createAuthoringFeatureRegistry({
      templateService: {
        createTemplate: async () => calls.push('createTemplate'),
        insertTemplate: async () => calls.push('insertTemplate')
      },
      settingsService: {
        openSettings: async () => calls.push('openSettings'),
        resetSettings: async () => calls.push('resetSettings'),
        showAutoPreviewSetting: async () => calls.push('showAutoPreviewSetting')
      },
      schemaManager: {
        reinitialize: async () => calls.push('reinitializeSchemas'),
        debugSchemas: async () => calls.push('debugSchemas')
      },
      logger: { info() {}, warn() {}, error() {}, debug() {} }
    });

    await registry.createTemplate();
    await registry.insertTemplate();
    await registry.openSettings();
    await registry.showJumpToDslHelp();
    await registry.resetSettings();
    await registry.showAutoPreviewSetting();
    await registry.reinitializeSchemas();
    await registry.debugSchemas();
    await registry.checkAutoPreviewSetting();

    assert.deepStrictEqual(calls, [
      'createTemplate',
      'insertTemplate',
      'openSettings',
      'resetSettings',
      'showAutoPreviewSetting',
      'reinitializeSchemas',
      'debugSchemas'
    ]);
    assert.strictEqual(infoMessage, 'Auto preview: ON');
  });

  it('createCommandFeatureBindings merges feature registries into command catalog deps', () => {
    const previewExport = {
      openPreviewWithCheck: async () => {},
      capturePreviewImage: async () => {},
      openDevTools: () => {},
      executeExport: async () => {}
    };
    const authoring = {
      createTemplate: async () => {},
      insertTemplate: async () => {},
      openSettings: async () => {},
      showJumpToDslHelp: async () => {},
      resetSettings: async () => {},
      showAutoPreviewSetting: async () => {},
      checkAutoPreviewSetting: async () => {},
      reinitializeSchemas: async () => {},
      debugSchemas: async () => {}
    };
    const runtimeInspection = {
      showPerformanceReport: async () => {},
      clearPerformanceMetrics: async () => {},
      togglePerformanceMonitoring: async () => {},
      enablePerformanceMonitoring: async () => {},
      generateSampleEvents: async () => {},
      showMemoryReport: async () => {},
      toggleMemoryTracking: async () => {},
      enableMemoryTracking: async () => {}
    };

    const bindings = createCommandFeatureBindings(previewExport, authoring, runtimeInspection);

    assert.strictEqual(bindings.openPreviewWithCheck, previewExport.openPreviewWithCheck);
    assert.strictEqual(bindings.checkAutoPreviewSetting, authoring.checkAutoPreviewSetting);
    assert.strictEqual(bindings.showMemoryReport, runtimeInspection.showMemoryReport);
  });

  it('authoring registry exposes jump-to-dsl help as an info-only command', async () => {
    let infoMessage;

    ErrorHandler.showInfo = (message) => {
      infoMessage = message;
    };

    const registry = createAuthoringFeatureRegistry({
      templateService: {
        createTemplate: async () => {},
        insertTemplate: async () => {}
      },
      settingsService: {
        openSettings: async () => {},
        resetSettings: async () => {},
        showAutoPreviewSetting: async () => {}
      },
      schemaManager: {
        reinitialize: async () => {},
        debugSchemas: async () => {}
      },
      logger: { info() {}, warn() {}, error() {}, debug() {} }
    });

    await registry.showJumpToDslHelp();

    assert.strictEqual(
      infoMessage,
      'Preview tip: Ctrl+Shift+Click (Mac: ⌘+Shift+Click) a component in the preview to jump to its DSL source.'
    );
  });
});
