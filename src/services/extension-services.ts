import type {
  ISchemaManager,
  IThemeManager,
  IWebViewManager,
  IExportManager,
  IExportService,
  ITemplateService,
  ISettingsService,
  IDiagnosticManager,
  ICompletionProvider,
  ICommandManager
} from '../types';

/**
 * 拡張が保持するサービス束（ファクトリ生成結果）
 */
export interface ExtensionServices {
  schemaManager: ISchemaManager;
  themeManager: IThemeManager;
  webViewManager: IWebViewManager;
  exportManager: IExportManager;
  exportService: IExportService;
  templateService: ITemplateService;
  settingsService: ISettingsService;
  diagnosticManager: IDiagnosticManager;
  completionProvider: ICompletionProvider;
  commandManager: ICommandManager;
}
