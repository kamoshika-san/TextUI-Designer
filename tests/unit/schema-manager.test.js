const { expect } = require('chai');
const sinon = require('sinon');
const path = require('path');
const fs = require('fs');

// テスト用モックファクトリーをインポート
const {
  createSchemaManagerForTest,
  createErrorTestDependencies
} = require('../mocks/schema-manager-factory');

// ErrorHandlerのモック
const mockErrorHandler = {
  withErrorHandling: sinon.stub(),
  withErrorHandlingSync: sinon.stub(),
  logError: sinon.stub(),
  showUserFriendlyError: sinon.stub()
};

// モジュールのモック
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function(id) {
  if (id === 'vscode') {
    return vscode;
  }
  if (id === '../../out/utils/error-handler.js') {
    return mockErrorHandler;
  }
  return originalRequire.apply(this, arguments);
};

// vscodeモック
const vscode = {
  ExtensionContext: class {
    constructor() {
      this.extensionPath = __dirname;
      this.globalState = { get: () => undefined, update: () => Promise.resolve() };
      this.workspaceState = { get: () => undefined, update: () => Promise.resolve() };
    }
  },
  workspace: {
    getConfiguration: () => ({ get: () => {}, update: () => Promise.resolve() })
  },
  Uri: {
    file: (path) => ({ fsPath: path, toString: () => `file://${path}` })
  }
};

describe('SchemaManager', () => {
  let mockContext;
  let schemaManager;
  let testSchemaPath;
  let testTemplateSchemaPath;
  let testThemeSchemaPath;

  beforeEach(function () {
    mockContext = new vscode.ExtensionContext();

    // テスト用パスの設定
    testSchemaPath = path.join(__dirname, 'test-schema.json');
    testTemplateSchemaPath = path.join(__dirname, 'test-template-schema.json');
    testThemeSchemaPath = path.join(__dirname, 'test-theme-schema.json');

    // テスト用スキーマファイルを作成
    fs.writeFileSync(testSchemaPath, JSON.stringify({ definitions: {} }));
    fs.writeFileSync(testThemeSchemaPath, JSON.stringify({ properties: { theme: {}, tokens: {} } }));

    // ErrorHandlerのモックをリセット
    mockErrorHandler.withErrorHandling.reset();
    mockErrorHandler.withErrorHandlingSync.reset();
    mockErrorHandler.logError.reset();
    mockErrorHandler.showUserFriendlyError.reset();

    // デフォルトでは成功するように設定
    mockErrorHandler.withErrorHandling.callsFake(async (operation, context, defaultValue) => {
      try {
        return await operation();
      } catch (error) {
        mockErrorHandler.logError(error, context);
        mockErrorHandler.showUserFriendlyError(error, context);
        return defaultValue || {};
      }
    });
    mockErrorHandler.withErrorHandlingSync.callsFake((operation, context, defaultValue) => {
      try {
        return operation();
      } catch (error) {
        mockErrorHandler.logError(error, context);
        mockErrorHandler.showUserFriendlyError(error, context);
        return defaultValue || {};
      }
    });

    // スタブをbeforeEachのスコープで作成し、thisに割り当てる
    this.yamlConfigStub = { get: sinon.stub().returns({}), update: sinon.stub().resolves() };
    this.jsonConfigStub = { get: sinon.stub().returns([]), update: sinon.stub().resolves() };

    // vscode.workspace.getConfigurationをスタブし、事前に作成したスタブを返すようにする
    const self = this;
    // 既存のスタブをクリアしてから新しいスタブを作成
    sinon.restore();
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

    // 依存性注入を使用してSchemaManagerを作成
    const testPaths = {
      schemaPath: testSchemaPath,
      templateSchemaPath: testTemplateSchemaPath,
      themeSchemaPath: testThemeSchemaPath
    };
    
    schemaManager = createSchemaManagerForTest(mockContext, testPaths, {}, mockErrorHandler);
  });

  afterEach(() => {
    sinon.restore(); // これによりvscode.workspace.getConfigurationのスタブを含む、すべてのSinonスタブが復元されます。
    if (schemaManager && typeof schemaManager.clearCache === 'function') {
      schemaManager.clearCache();
    }
    
    // テスト用ファイルを削除
    try {
      if (fs.existsSync(testSchemaPath)) fs.unlinkSync(testSchemaPath);
      if (fs.existsSync(testTemplateSchemaPath)) fs.unlinkSync(testTemplateSchemaPath);
      if (fs.existsSync(testThemeSchemaPath)) fs.unlinkSync(testThemeSchemaPath);
    } catch (error) {
      // ファイル削除エラーは無視
    }
  });

  it('initialize()でスキーマ初期化が成功する', async () => {
    // テスト用テンプレートスキーマファイルを事前に削除
    if (fs.existsSync(testTemplateSchemaPath)) fs.unlinkSync(testTemplateSchemaPath);
    // ErrorHandlerのモックを成功するように設定
    mockErrorHandler.withErrorHandling.callsFake(async (operation, context) => {
      return await operation();
    });
    
    await schemaManager.initialize();
    expect(fs.existsSync(testTemplateSchemaPath)).to.be.true;
  });

  it('registerSchemas()でYAML/JSON拡張にスキーマ登録できる', async function () {
    await schemaManager.registerSchemas();
    // registrarのspyが呼ばれていることを確認
    expect(schemaManager.dependencies.registrar.registerSchemas.called).to.be.true;
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
    await schemaManager.cleanup();
    // registrarのspyが呼ばれていることを確認
    expect(schemaManager.dependencies.registrar.cleanupSchemas.called).to.be.true;
  });

  it('reinitialize()で再初期化できる', async () => {
    await schemaManager.reinitialize();
    expect(schemaManager.schemaCache).to.be.null;
  });

  it('パス解決ロジックが正しく動作する', () => {
    const manager = new (require('../../out/services/schema-manager').SchemaManager)(mockContext);
    expect(manager.getSchemaPath()).to.include('schema.json');
    expect(manager.getTemplateSchemaPath()).to.include('template-schema.json');
    expect(manager.getThemeSchemaPath()).to.include('theme-schema.json');
  });

  describe('エラー系', () => {
    let errorTestErrorHandler;

    beforeEach(() => {
      // エラー系テスト専用のErrorHandlerを作成
      errorTestErrorHandler = {
        withErrorHandling: sinon.stub().callsFake(async (operation, context, defaultValue) => {
          try {
            return await operation();
          } catch (error) {
            // エラーログとユーザー表示は呼ぶが、必ずthrowする
            mockErrorHandler.logError(error, context);
            mockErrorHandler.showUserFriendlyError(error, context);
            throw error; // デフォルト値returnは絶対にしない
          }
        }),
        logError: sinon.stub(),
        showUserFriendlyError: sinon.stub()
      };
    });

    it('スキーマファイルが存在しない場合はエラー', async () => {
      const testPaths = {
        schemaPath: '/not/exist/schema.json',
        templateSchemaPath: testTemplateSchemaPath,
        themeSchemaPath: testThemeSchemaPath
      };
      const errorDependencies = createErrorTestDependencies(testPaths, 'schema', errorTestErrorHandler);
      const { SchemaManagerFactory } = require('../../out/services/schema-manager-factory');
      const errorManager = SchemaManagerFactory.createForTest(mockContext, errorDependencies);
      let caught = false;
      try {
        await errorManager.loadSchema();
        expect.fail('catchされずに成功してしまった');
      } catch (error) {
        caught = true;
        expect(error.message).to.include('スキーマファイルの読み込みに失敗しました');
      }
      if (!caught) expect.fail('catchされなかった');
    });

    it('テンプレートスキーマファイルが存在しない場合はエラー', async () => {
      const testPaths = {
        schemaPath: testSchemaPath,
        templateSchemaPath: '/not/exist/template-schema.json',
        themeSchemaPath: testThemeSchemaPath
      };
      const errorDependencies = createErrorTestDependencies(testPaths, 'templateSchema', errorTestErrorHandler);
      const errorSchemaManager = new (require('../../out/services/schema-manager').SchemaManager)(
        mockContext, errorTestErrorHandler, errorDependencies
      );
      let caught = false;
      try {
        await errorSchemaManager.loadTemplateSchema();
        expect.fail('catchされずに成功してしまった');
      } catch (error) {
        caught = true;
        expect(error.message).to.include('テンプレートスキーマファイルの読み込みに失敗しました');
      }
      if (!caught) expect.fail('catchされなかった');
    });

    it('テーマスキーマファイルが存在しない場合はエラー', async () => {
      const testPaths = {
        schemaPath: testSchemaPath,
        templateSchemaPath: testTemplateSchemaPath,
        themeSchemaPath: '/not/exist/theme-schema.json'
      };
      const errorDependencies = createErrorTestDependencies(testPaths, 'themeSchema', errorTestErrorHandler);
      const errorSchemaManager = new (require('../../out/services/schema-manager').SchemaManager)(
        mockContext, errorTestErrorHandler, errorDependencies
      );
      let caught = false;
      try {
        await errorSchemaManager.loadThemeSchema();
        expect.fail('catchされずに成功してしまった');
      } catch (error) {
        caught = true;
        expect(error.message).to.include('テーマスキーマファイルの読み込みに失敗しました');
      }
      if (!caught) expect.fail('catchされなかった');
    });

    it('無効なJSONファイルの場合はエラー', async () => {
      const tempPath = path.join(__dirname, 'temp-invalid.json');
      fs.writeFileSync(tempPath, 'invalid json');
      try {
        const testPaths = {
          schemaPath: tempPath,
          templateSchemaPath: testTemplateSchemaPath,
          themeSchemaPath: testThemeSchemaPath
        };
        const errorDependencies = createErrorTestDependencies(testPaths, 'schema', errorTestErrorHandler);
        const errorSchemaManager = new (require('../../out/services/schema-manager').SchemaManager)(
          mockContext, errorTestErrorHandler, errorDependencies
        );
        let caught = false;
        try {
          await errorSchemaManager.loadSchema();
          expect.fail('catchされずに成功してしまった');
        } catch (error) {
          caught = true;
          expect(error.message).to.include('スキーマファイルの読み込みに失敗しました');
        }
        if (!caught) expect.fail('catchされなかった');
      } finally {
        fs.unlinkSync(tempPath);
      }
    });
  });
}); 