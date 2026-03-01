const assert = require('assert');
const path = require('path');
const os = require('os');
const fs = require('fs');
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

  it('$include で参照したテンプレートを解決し、ネストした参照も展開する', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'textui-include-'));
    const nestedTemplatePath = path.join(tmpDir, 'nested.template.yml');
    const templatePath = path.join(tmpDir, 'form.template.yml');

    fs.writeFileSync(nestedTemplatePath, `- Text:\n    variant: p\n    value: \"Nested: {{ $params.description }}\"\n`, 'utf8');
    fs.writeFileSync(templatePath, `- Text:\n    variant: h2\n    value: \"{{ $params.title }}\"\n- $include:\n    template: \"./nested.template.yml\"\n    params:\n      description: \"{{ $params.description }}\"\n`, 'utf8');

    const mainContent = `page:\n  components:\n    - $include:\n        template: \"./form.template.yml\"\n        params:\n          title: \"Hello\"\n          description: \"World\"\n`;

    try {
      setActiveEditor(mainContent);
      vscodeApi.window.activeTextEditor.document.fileName = path.join(tmpDir, 'page.tui.yml');

      const parser = new YamlParser({ loadSchema: async () => ({ type: 'object' }) });
      PerformanceMonitor.getInstance().setEnabled(false);
      const result = await parser.parseYamlFile();

      assert.strictEqual(result.data.page.components[0].Text.value, 'Hello');
      assert.strictEqual(result.data.page.components[1].Text.value, 'Nested: World');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('$include の循環参照を検出して YamlParseError を返す', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'textui-include-cycle-'));
    const templateAPath = path.join(tmpDir, 'a.template.yml');
    const templateBPath = path.join(tmpDir, 'b.template.yml');

    fs.writeFileSync(templateAPath, `- $include:\n    template: \"./b.template.yml\"\n`, 'utf8');
    fs.writeFileSync(templateBPath, `- $include:\n    template: \"./a.template.yml\"\n`, 'utf8');

    try {
      setActiveEditor(`page:\n  components:\n    - $include:\n        template: \"./a.template.yml\"\n`);
      vscodeApi.window.activeTextEditor.document.fileName = path.join(tmpDir, 'main.tui.yml');

      const parser = new YamlParser({ loadSchema: async () => ({ type: 'object' }) });
      PerformanceMonitor.getInstance().setEnabled(false);

      await assert.rejects(
        () => parser.parseYamlFile(),
        (error) => {
          assert.strictEqual(error.name, 'YamlParseError');
          assert.match(error.message, /循環参照/);
          return true;
        }
      );
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
