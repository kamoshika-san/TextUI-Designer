const fs = require('fs');
const sinon = require('sinon');

/**
 * テスト用のモックTemplateSchemaCreator
 */
const createMockTemplateSchemaCreator = () => ({
  createTemplateSchema: async (schemaPath, templateSchemaPath) => {
    // テスト用のダミーファイルを生成
    fs.writeFileSync(templateSchemaPath, JSON.stringify({
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          template: { type: 'string' },
          params: { type: 'object' }
        }
      }
    }));
  }
});

/**
 * テスト用のモックSchemaPathResolver
 */
const createMockSchemaPathResolver = (testPaths) => ({
  resolvePaths: () => testPaths,
  getSchemaUris: () => ({
    schemaUri: 'file://' + testPaths.schemaPath,
    templateSchemaUri: 'file://' + testPaths.templateSchemaPath,
    themeSchemaUri: 'file://' + testPaths.themeSchemaPath
  }),
  debugPaths: () => {},
  validatePaths: () => ({ valid: true, missing: [] }),
  clearCache: () => {}
});

/**
 * テスト用のモックCachedSchemaLoader
 */
const createMockCachedSchemaLoader = (mockData) => ({
  load: async (schemaPath) => {
    if (mockData && mockData.error) {
      throw new Error(mockData.error);
    }
    return mockData || { definitions: {} };
  },
  clearCache: () => {},
  getCacheStats: () => ({ hits: 0, misses: 0, size: 0 })
});

/**
 * テスト用のモックSchemaRegistrar（sinon.spyでラップ）
 */
const createMockSchemaRegistrar = () => {
  const registrar = {
    registerSchemas: async (config) => {},
    cleanupSchemas: async () => {}
  };
  registrar.registerSchemas = sinon.spy(registrar.registerSchemas);
  registrar.cleanupSchemas = sinon.spy(registrar.cleanupSchemas);
  return registrar;
};

/**
 * テスト用のSchemaManager依存関係を作成
 * mockData: { schema, templateSchema, themeSchema }
 */
const createSchemaManagerDependencies = (testPaths, mockData = {}, errorHandler) => {
  // デフォルト値をテスト期待値に合わせて柔軟に
  return {
    templateSchemaCreator: createMockTemplateSchemaCreator(),
    pathResolver: createMockSchemaPathResolver(testPaths),
    schemaLoader: createMockCachedSchemaLoader(mockData.schema),
    templateSchemaLoader: createMockCachedSchemaLoader(
      mockData.templateSchema || { type: 'array' }
    ),
    themeSchemaLoader: createMockCachedSchemaLoader(
      mockData.themeSchema || { properties: { theme: {}, tokens: {} } }
    ),
    registrar: createMockSchemaRegistrar(),
    errorHandler // 追加
  };
};

/**
 * テスト用のSchemaManagerを作成
 */
const createSchemaManagerForTest = (context, testPaths, mockData = {}, errorHandler) => {
  const dependencies = createSchemaManagerDependencies(testPaths, mockData, errorHandler);
  // SchemaManagerFactoryを使用してテスト用インスタンスを作成
  const { SchemaManagerFactory } = require('../../out/services/schema-manager-factory');
  const manager = SchemaManagerFactory.createForTest(context, dependencies);
  // registrarのspyをテストから参照できるように
  manager.dependencies = dependencies;
  return manager;
};

/**
 * エラーテスト用の依存関係を作成
 */
const createErrorTestDependencies = (testPaths, errorType, errorHandler) => {
  const mockData = {};
  switch (errorType) {
    case 'schema':
      mockData.schema = { error: 'スキーマファイルの読み込みに失敗しました' };
      break;
    case 'templateSchema':
      mockData.templateSchema = { error: 'テンプレートスキーマファイルの読み込みに失敗しました' };
      break;
    case 'themeSchema':
      mockData.themeSchema = { error: 'テーマスキーマファイルの読み込みに失敗しました' };
      break;
  }
  return createSchemaManagerDependencies(testPaths, mockData, errorHandler);
};

module.exports = {
  createMockTemplateSchemaCreator,
  createMockSchemaPathResolver,
  createMockCachedSchemaLoader,
  createMockSchemaRegistrar,
  createSchemaManagerDependencies,
  createSchemaManagerForTest,
  createErrorTestDependencies
}; 