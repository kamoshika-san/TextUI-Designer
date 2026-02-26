const assert = require('assert');
const path = require('path');
const Module = require('module');

describe('YamlParser スキーマ検証', () => {
  const yamlParserModulePath = path.resolve(__dirname, '../../out/services/webview/yaml-parser.js');
  const performanceMonitorModulePath = path.resolve(__dirname, '../../out/utils/performance-monitor.js');

  let YamlParser;
  let PerformanceMonitor;
  let previousRequireHook;
  let vscodeApi;

  const schema = {
    type: 'object',
    required: ['page'],
    properties: {
      page: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' }
        }
      }
    }
  };

  const setActiveEditor = (content) => {
    if (!vscodeApi.window) {
      vscodeApi.window = {};
    }

    vscodeApi.window.activeTextEditor = {
      document: {
        fileName: '/tmp/test.tui.yml',
        getText: () => content
      }
    };
  };

  beforeEach(() => {
    global.cleanupMocks?.();

    vscodeApi = global.vscode || require('../mocks/vscode-mock');

    if (!vscodeApi.window) {
      vscodeApi.window = {};
    }
    if (!vscodeApi.workspace) {
      vscodeApi.workspace = {};
    }
    if (!vscodeApi.env) {
      vscodeApi.env = {};
    }
    if (!vscodeApi.UIKind) {
      vscodeApi.UIKind = {};
    }

    vscodeApi.env.uiKind = 1;
    vscodeApi.UIKind.Web = 2;
    global.vscode = vscodeApi;

    previousRequireHook = Module.prototype.require;
    Module.prototype.require = function(id) {
      if (id === 'vscode') {
        return vscodeApi;
      }
      return previousRequireHook.apply(this, arguments);
    };

    delete require.cache[yamlParserModulePath];
    delete require.cache[performanceMonitorModulePath];
    ({ YamlParser } = require(yamlParserModulePath));
    ({ PerformanceMonitor } = require(performanceMonitorModulePath));

    delete global.globalSchemaManager;
  });

  afterEach(() => {
    if (vscodeApi?.window) {
      vscodeApi.window.activeTextEditor = null;
    }
    delete global.globalSchemaManager;
    PerformanceMonitor.getInstance().dispose();

    if (previousRequireHook) {
      Module.prototype.require = previousRequireHook;
      previousRequireHook = null;
    }
  });

  it('global を参照せず注入された schemaLoader を使用する', async () => {
    let loadSchemaCallCount = 0;
    const schemaLoader = {
      loadSchema: async () => {
        loadSchemaCallCount += 1;
        return schema;
      }
    };

    global.globalSchemaManager = {
      loadSchema: async () => {
        throw new Error('globalSchemaManager should not be used');
      }
    };

    setActiveEditor(`page:
  id: "sample-page"`);

    const parser = new YamlParser(schemaLoader);
    PerformanceMonitor.getInstance().setEnabled(false);
    const result = await parser.parseYamlFile();

    assert.strictEqual(loadSchemaCallCount, 1);
    assert.strictEqual(result.data.page.id, 'sample-page');
  });

  it('不正な YAML は SchemaValidationError になる', async () => {
    const schemaLoader = {
      loadSchema: async () => schema
    };

    setActiveEditor(`page:
  title: "missing-id"`);

    const parser = new YamlParser(schemaLoader);
    PerformanceMonitor.getInstance().setEnabled(false);

    await assert.rejects(
      () => parser.parseYamlFile(),
      (error) => {
        assert.strictEqual(error.name, 'SchemaValidationError');
        return true;
      }
    );
  });
});
