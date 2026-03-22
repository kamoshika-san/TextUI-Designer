# 統合テストでの ServiceFactory（T-211）

## 方針

- 拡張のサービス束は本番でも [`ServiceFactory`](../src/services/service-factory.ts) 経由で組み立てる。
- 統合テストでは **`new CommandManager` など単体直構築に頼らず**、`ServiceFactory` + `ServiceFactoryOverrides` で差し替え可能な経路を明示する。
- 診断・補完など、テストで不要な重い依存は [`tests/helpers/integration-service-factory.js`](../tests/helpers/integration-service-factory.js) の `integrationServiceFactoryStubs()` で無効化する。
- グローバル `require` フックの拡大は避ける（正本: [`docs/test-setup-policy.md`](./test-setup-policy.md)）。

## 最小例

```js
const { CommandManager } = require('../../out/services/command-manager');
const {
  createIntegrationServices,
  createDefaultExportManagerForIntegration
} = require('../helpers/integration-service-factory');

const services = createIntegrationServices(mockContext, {
  createSchemaManager: () => mockSchema,
  createThemeManager: () => mockTheme,
  createWebViewManager: () => mockWebView,
  createExportManager: () => createDefaultExportManagerForIntegration(),
  createTemplateService: () => mockTemplate,
  createSettingsService: () => mockSettings,
  createCommandManager: (ctx, deps) =>
    new CommandManager(ctx, {
      webViewManager: mockWebView,
      exportService: deps.exportService,
      templateService: mockTemplate,
      settingsService: mockSettings,
      schemaManager: mockSchema,
      themeManager: mockTheme
    })
});

const { commandManager } = services;
```

## 関連

- ユニットテストでのオーバーライド実演: [`tests/unit/service-factory-di-injection.test.js`](../tests/unit/service-factory-di-injection.test.js)
