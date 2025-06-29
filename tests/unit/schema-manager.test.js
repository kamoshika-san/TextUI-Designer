const sinon = require('sinon');
const path = require('path');
const fs = require('fs');
const { expect } = require('chai');

// VSCode APIのモック
// グローバルなyamlConfigStubとjsonConfigStubの宣言は削除します。
// これらはbeforeEach内で毎回新しく作成し、thisに設定します。
const vscode = {
  ExtensionContext: class {
    constructor() {
      this.extensionPath = __dirname; // テスト用にカレントディレクトリ
      this.subscriptions = [];
    }
  },
  Uri: {
    file: (filePath) => ({ toString: () => `file://${filePath}` })
  },
  workspace: {
    getConfiguration: () => {},
  },
  ConfigurationTarget: {
    Global: 1,
    Workspace: 2,
    WorkspaceFolder: 3
  }
};

// vscodeモジュールをグローバルにモック
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function(id) {
  if (id === 'vscode') {
    return vscode;
  }
  return originalRequire.apply(this, arguments);
};

// テスト用の最小限schema.json
const testSchemaPath = path.join(__dirname, 'schemas', 'schema.json');
const testTemplateSchemaPath = path.join(__dirname, 'schemas', 'template-schema.json');
const testThemeSchemaPath = path.join(__dirname, 'schemas', 'theme-schema.json');
const testSchemaContent = {
  $id: 'test-schema',
  type: 'object',
  definitions: {
    component: { type: 'object', properties: { foo: { type: 'string' } } }
  }
};
const testThemeSchemaContent = {
  $id: 'test-theme-schema',
  type: 'object',
  properties: {
    theme: { type: 'object' },
    tokens: { type: 'object' }
  }
};

// テスト用SchemaManager（本番実装をrequireしてもOK）
const { SchemaManager } = require('../../out/services/schema-manager.js');

describe('SchemaManager', () => {
  let schemaManager;
  let mockContext;
  // this.yamlConfigStub と this.jsonConfigStub を使用するため、ここで宣言は不要

  before(() => {
    // テスト用schema.jsonを作成
    fs.mkdirSync(path.dirname(testSchemaPath), { recursive: true });
    fs.writeFileSync(testSchemaPath, JSON.stringify(testSchemaContent, null, 2), 'utf-8');
    fs.writeFileSync(testThemeSchemaPath, JSON.stringify(testThemeSchemaContent, null, 2), 'utf-8');
    // template-schema.jsonはテストで自動生成される
  });

  after(() => {
    // テスト用ファイル削除
    if (fs.existsSync(testSchemaPath)) fs.unlinkSync(testSchemaPath);
    if (fs.existsSync(testTemplateSchemaPath)) fs.unlinkSync(testTemplateSchemaPath);
    if (fs.existsSync(testThemeSchemaPath)) fs.unlinkSync(testThemeSchemaPath);
    if (fs.existsSync(path.dirname(testSchemaPath))) fs.rmdirSync(path.dirname(testSchemaPath));
    // モックを復元
    Module.prototype.require = originalRequire;
  });

  beforeEach(function () {
    mockContext = new vscode.ExtensionContext();

    // スタブをbeforeEachのスコープで作成し、thisに割り当てる
    this.yamlConfigStub = { get: sinon.stub().returns({}), update: sinon.stub().resolves() };
    this.jsonConfigStub = { get: sinon.stub().returns([]), update: sinon.stub().resolves() };

    // vscode.workspace.getConfigurationをスタブし、事前に作成したスタブを返すようにする
    const self = this;
    sinon.stub(vscode.workspace, 'getConfiguration').callsFake(function(section) {
      if (section === 'yaml') {
        return self.yamlConfigStub;
      }
      if (section === 'json') {
        return self.jsonConfigStub;
      }
      // 他のセクションが呼ばれた場合のためのデフォルトスタブ
      return { get: sinon.stub(), update: sinon.stub().resolves() };
    });

    schemaManager = new SchemaManager(mockContext);
    // テスト用パスを強制上書き
    schemaManager.schemaPath = testSchemaPath;
    schemaManager.templateSchemaPath = testTemplateSchemaPath;
    schemaManager.themeSchemaPath = testThemeSchemaPath;
  });

  afterEach(() => {
    sinon.restore(); // これによりvscode.workspace.getConfigurationのスタブを含む、すべてのSinonスタブが復元されます。
    schemaManager.clearCache();
  });

  it('initialize()でスキーマ初期化が成功する', async () => {
    try {
      await schemaManager.initialize();
      expect(fs.existsSync(testTemplateSchemaPath)).to.be.true;
    } catch (error) {
      expect.fail(`初期化が失敗しました: ${error.message}`);
    }
  });

  it('registerSchemas()でYAML/JSON拡張にスキーマ登録できる', async function () {
    try {
      await schemaManager.registerSchemas();
      expect(this.yamlConfigStub.update.called).to.be.true;
      expect(this.jsonConfigStub.update.called).to.be.true;
    } catch (error) {
      expect.fail(`スキーマ登録が失敗しました: ${error.message}`);
    }
  });

  it('loadSchema()でスキーマを読み込める', async () => {
    const schema = await schemaManager.loadSchema();
    expect(schema).to.have.property('definitions');
  });

  it('loadTemplateSchema()でテンプレートスキーマを読み込める', async () => {
    await schemaManager.createTemplateSchema();
    const templateSchema = await schemaManager.loadTemplateSchema();
    expect(templateSchema).to.have.property('type', 'array');
  });

  it('loadThemeSchema()でテーマスキーマを読み込める', async () => {
    const themeSchema = await schemaManager.loadThemeSchema();
    expect(themeSchema).to.have.property('properties');
    expect(themeSchema.properties).to.have.property('theme');
    expect(themeSchema.properties).to.have.property('tokens');
  });

  it('createTemplateSchema()でテンプレートスキーマが生成される', async () => {
    if (fs.existsSync(testTemplateSchemaPath)) fs.unlinkSync(testTemplateSchemaPath);
    await schemaManager.createTemplateSchema();
    expect(fs.existsSync(testTemplateSchemaPath)).to.be.true;
  });

  it('cleanup()でスキーマ設定がクリーンアップされる', async function () {
    try {
      await schemaManager.cleanup();
      expect(this.yamlConfigStub.update.called).to.be.true;
      expect(this.jsonConfigStub.update.called).to.be.true;
    } catch (error) {
      expect.fail(`クリーンアップが失敗しました: ${error.message}`);
    }
  });

  it('reinitialize()で再初期化できる', async () => {
    try {
      await schemaManager.reinitialize();
      expect(schemaManager.schemaCache).to.be.null;
    } catch (error) {
      expect.fail(`再初期化が失敗しました: ${error.message}`);
    }
  });

  it('パス解決ロジックが正しく動作する', () => {
    const manager = new SchemaManager(mockContext);
    expect(manager.getSchemaPath()).to.include('schema.json');
    expect(manager.getTemplateSchemaPath()).to.include('template-schema.json');
    expect(manager.getThemeSchemaPath()).to.include('theme-schema.json');
  });

  it('スキーマファイルが存在しない場合はエラー', async () => {
    schemaManager.schemaPath = '/not/exist/schema.json';
    try {
      await schemaManager.loadSchema();
      expect.fail('エラーが発生すべきでした');
    } catch (error) {
      expect(error.message).to.include('スキーマファイルの読み込みに失敗しました');
    }
  });

  it('テンプレートスキーマファイルが存在しない場合はエラー', async () => {
    schemaManager.templateSchemaPath = '/not/exist/template-schema.json';
    try {
      await schemaManager.loadTemplateSchema();
      expect.fail('エラーが発生すべきでした');
    } catch (error) {
      expect(error.message).to.include('テンプレートスキーマファイルの読み込みに失敗しました');
    }
  });

  it('テーマスキーマファイルが存在しない場合はエラー', async () => {
    schemaManager.themeSchemaPath = '/not/exist/theme-schema.json';
    try {
      await schemaManager.loadThemeSchema();
      expect.fail('エラーが発生すべきでした');
    } catch (error) {
      expect(error.message).to.include('テーマスキーマファイルの読み込みに失敗しました');
    }
  });

  it('無効なJSONファイルの場合はエラー', async () => {
    const tempPath = path.join(__dirname, 'temp-invalid-schema.json');
    fs.writeFileSync(tempPath, 'invalid json content');
    schemaManager.schemaPath = tempPath;
    try {
      await schemaManager.loadSchema();
      expect.fail('エラーが発生すべきでした');
    } catch (error) {
      expect(error.message).to.include('スキーマファイルの読み込みに失敗しました');
    } finally {
      fs.unlinkSync(tempPath);
    }
  });
}); 