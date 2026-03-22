'use strict';

const { ServiceFactory } = require('../../out/services/service-factory');
const { ExportManager } = require('../../out/exporters');

/**
 * 統合テストで {@link ServiceFactory} を使うときの最小スタブ（診断・補完）。
 * `ServiceFactoryOverrides` にスプレッドしてからテスト固有の create* を上書きする。
 */
function integrationServiceFactoryStubs() {
  return {
    createDiagnosticManager: () => ({
      validateAndReportDiagnostics: async () => {},
      clearDiagnostics: () => {},
      clearDiagnosticsForUri: () => {},
      clearCache: () => {},
      dispose: () => {}
    }),
    createCompletionProvider: () => ({
      provideCompletionItems: async () => []
    })
  };
}

/**
 * `ServiceFactory` を生成し `create()` 済みのサービス束を返す（T-211 雛形）。
 *
 * @param {import('vscode').ExtensionContext} context
 * @param {import('../../out/services/service-initializer').ServiceFactoryOverrides} overrides
 * @returns {import('../../out/services/service-factory').ServiceFactoryResult}
 */
function createIntegrationServices(context, overrides = {}) {
  const factory = new ServiceFactory(context, {
    ...integrationServiceFactoryStubs(),
    ...overrides
  });
  return factory.create();
}

module.exports = {
  createIntegrationServices,
  integrationServiceFactoryStubs,
  /** 軽量な本物（エクスポート経路の結合に利用可） */
  createDefaultExportManagerForIntegration: () => new ExportManager()
};
