const assert = require('assert');

/**
 * T-20260321-111: DI 注入の実演（第2段階）。
 * ServiceFactory オーバーライドでテスト対象を差し替え、`tests/setup.js` のグローバルフックを増やさない。
 * 方針正本: docs/current/testing-ci/test-setup-policy.md
 */
describe('T-111: ServiceFactory による DI（グローバルフック非拡大）', () => {
  let ServiceFactory;

  before(() => {
    ({ ServiceFactory } = require('../../out/services/service-factory'));
  });

  it('createSchemaManager オーバーライドで SchemaManager の実装を差し替えられる', () => {
    const context = { subscriptions: [], extensionPath: process.cwd() };
    const mockSchema = {
      async initialize() {},
      async cleanup() {},
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

    const factory = new ServiceFactory(context, {
      createSchemaManager: () => mockSchema
    });

    const result = factory.create();
    assert.strictEqual(result.schemaManager, mockSchema);
  });
});
