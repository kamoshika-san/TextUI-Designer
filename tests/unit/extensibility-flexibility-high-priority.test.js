const assert = require('assert');

describe('高優先度課題: 拡張性・柔軟性', () => {
  let ConfigManager;
  let TextUICompletionProvider;
  let vscode;

  const createConfigProvider = (values) => () => ({
    get: (key, defaultValue) => (key in values ? values[key] : defaultValue),
    update: async () => {}
  });

  const createMockDocument = (content, fileName) => ({
    fileName,
    uri: { toString: () => `file://${fileName}` },
    getText: () => content,
    offsetAt: (position) => {
      const lines = content.split('\n');
      let offset = 0;
      for (let i = 0; i < position.line; i += 1) {
        offset += (lines[i] || '').length + 1;
      }
      return offset + position.character;
    }
  });

  before(() => {
    vscode = global.vscode;

    // completion-provider 実行に必要な最小APIを補完
    vscode.CompletionItem = class {
      constructor(label, kind) {
        this.label = label;
        this.kind = kind;
        this.detail = '';
        this.insertText = '';
        this.sortText = '';
      }
    };
    vscode.CompletionItemKind = {
      Class: 7,
      Property: 9,
      Value: 12,
      Module: 3,
      Field: 5
    };
    vscode.Position = class {
      constructor(line, character) {
        this.line = line;
        this.character = character;
      }
    };

    ({ ConfigManager } = require('../../out/utils/config-manager'));
    ({ TextUICompletionProvider } = require('../../out/services/completion-provider'));
  });

  afterEach(() => {
    ConfigManager.resetConfigProvider();
  });

  it('ConfigManager.isSupportedFile は設定された拡張子で判定する', () => {
    ConfigManager.setConfigProvider(
      createConfigProvider({
        supportedFileExtensions: ['.tui.yml', '.custom.yaml']
      })
    );

    assert.strictEqual(ConfigManager.isSupportedFile('/tmp/example.tui.yml'), true);
    assert.strictEqual(ConfigManager.isSupportedFile('/tmp/example.CUSTOM.YAML'), true);
    assert.strictEqual(ConfigManager.isSupportedFile('/tmp/example.tui.yaml'), false);
  });

  it('ConfigManager.getConfigurationSchema は customTemplates を object 配列として定義する', () => {
    const schema = ConfigManager.getConfigurationSchema();
    const customTemplates = schema.properties['templates.customTemplates'];

    assert.strictEqual(customTemplates.type, 'array');
    assert.strictEqual(customTemplates.items.type, 'object');
    assert.deepStrictEqual(customTemplates.items.required, ['name', 'path']);
    assert.strictEqual(customTemplates.items.properties.name.type, 'string');
    assert.strictEqual(customTemplates.items.properties.path.type, 'string');
  });



  it('ConfigManager.getConfigurationSchema は package.json の設定プロパティ全体と整合する', () => {
    const fs = require('fs');
    const path = require('path');
    const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
    const packageProperties = packageJson.contributes.configuration.properties;

    const normalize = (properties) => {
      const normalized = {};
      for (const [fullKey, value] of Object.entries(properties)) {
        if (!fullKey.startsWith('textui-designer.')) {
          continue;
        }
        const key = fullKey.replace('textui-designer.', '');
        normalized[key] = {
          type: value.type,
          default: value.default,
          description: value.description,
          enum: value.enum,
          minimum: value.minimum,
          maximum: value.maximum,
          required: value.required,
          items: value.items
        };
      }
      return normalized;
    };

    const pickComparableProps = (properties) => {
      const comparable = {};
      for (const [key, value] of Object.entries(properties)) {
        comparable[key] = {
          type: value.type,
          default: value.default,
          description: value.description,
          enum: value.enum,
          minimum: value.minimum,
          maximum: value.maximum,
          required: value.required,
          items: value.items
        };
      }
      return comparable;
    };

    const expected = normalize(packageProperties);
    const actual = pickComparableProps(ConfigManager.getConfigurationSchema().properties);

    assert.deepStrictEqual(actual, expected);
  });

  it('CompletionProvider は設定拡張子を使って補完対象を判定する', async () => {
    ConfigManager.setConfigProvider(
      createConfigProvider({
        supportedFileExtensions: ['.custom.yml']
      })
    );

    const provider = new TextUICompletionProvider({
      loadSchema: async () => ({})
    });
    const context = { triggerCharacter: '' };
    const content = 'page:\n  components:\n    - ';

    const supportedDoc = createMockDocument(content, '/tmp/sample.custom.yml');
    const unsupportedDoc = createMockDocument(content, '/tmp/sample.tui.yml');
    const position = new vscode.Position(2, 6);

    const supportedItems = await provider.generateCompletionItems(supportedDoc, position, context);
    const unsupportedItems = await provider.generateCompletionItems(unsupportedDoc, position, context);

    assert.ok(Array.isArray(supportedItems) && supportedItems.length > 0);
    assert.deepStrictEqual(unsupportedItems, []);
  });

  it('CompletionProvider の Button 補完は DSL型に一致する', () => {
    const provider = new TextUICompletionProvider({
      loadSchema: async () => ({})
    });

    const labels = provider
      .getComponentPropertyCompletions('Button')
      .map(item => item.label);

    assert.ok(labels.includes('kind'));
    assert.ok(labels.includes('label'));
    assert.ok(!labels.includes('variant'));
    assert.ok(!labels.includes('text'));
  });


  it('CompletionProvider は既存プロパティを重複候補から除外する', () => {
    const provider = new TextUICompletionProvider({
      loadSchema: async () => ({})
    });

    const existingProperties = new Set(['label']);
    const labels = provider
      .getComponentPropertyCompletions('Button', existingProperties)
      .map(item => item.label);

    assert.ok(!labels.includes('label'));
    assert.ok(labels.includes('kind'));
  });

  it('CompletionProvider は page 定義済み時に root 候補を抑制する', () => {
    const provider = new TextUICompletionProvider({
      loadSchema: async () => ({})
    });

    const items = provider.getRootLevelCompletions(new Set(['page']));
    assert.strictEqual(items.length, 0);
  });
  it('CompletionProvider の variant 値補完は Text 型に一致する', () => {
    const provider = new TextUICompletionProvider({
      loadSchema: async () => ({})
    });

    const values = provider
      .getPropertyValueCompletions('variant', 'Text')
      .map(item => item.label);

    assert.ok(values.includes('small'));
    assert.ok(values.includes('caption'));
    assert.ok(!values.includes('span'));
  });
});
