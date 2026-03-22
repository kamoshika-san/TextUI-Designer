import { ErrorHandler } from '../utils/error-handler';
import { ConfigManager } from '../utils/config-manager';
import type {
  IExportService,
  ISchemaManager,
  ISettingsService,
  ITemplateService,
  IWebViewManager,
  IThemeManager
} from '../types';
import type { CommandCatalogDependencies } from './command-catalog-deps';
import type { RuntimeInspectionCommandBindings } from './runtime-inspection-command-bindings';
import { executeCapturePreviewCommand } from './commands/capture-preview-command';
import { executeExportCommand } from './commands/export-command';
import { executeOpenPreviewCommand } from './commands/open-preview-command';
import { Logger } from '../utils/logger';

export interface PreviewExportFeatureRegistryDependencies {
  webViewManager: IWebViewManager;
  exportService: IExportService;
  themeManager?: IThemeManager;
  extensionPath: string;
  logger: Logger;
}

export interface AuthoringFeatureRegistryDependencies {
  templateService: ITemplateService;
  settingsService: ISettingsService;
  schemaManager: ISchemaManager;
  logger: Logger;
}

export type CommandFeatureBindings = Pick<
  CommandCatalogDependencies,
  | 'openPreviewWithCheck'
  | 'capturePreviewImage'
  | 'openDevTools'
  | 'executeExport'
  | 'createTemplate'
  | 'insertTemplate'
  | 'openSettings'
  | 'resetSettings'
  | 'showAutoPreviewSetting'
  | 'checkAutoPreviewSetting'
  | 'reinitializeSchemas'
  | 'debugSchemas'
>;

export function createPreviewExportFeatureRegistry(
  deps: PreviewExportFeatureRegistryDependencies
): Pick<
  CommandFeatureBindings,
  'openPreviewWithCheck' | 'capturePreviewImage' | 'openDevTools' | 'executeExport'
> {
  return {
    openPreviewWithCheck: () => executeOpenPreviewCommand(deps.webViewManager, deps.logger),
    capturePreviewImage: () =>
      executeCapturePreviewCommand({
        webViewManager: deps.webViewManager,
        themeManager: deps.themeManager,
        extensionPath: deps.extensionPath,
        logger: deps.logger
      }),
    openDevTools: () => deps.webViewManager.openDevTools(),
    executeExport: (filePath?: string) => executeExportCommand(deps.exportService, filePath)
  };
}

export function createAuthoringFeatureRegistry(
  deps: AuthoringFeatureRegistryDependencies
): Pick<
  CommandFeatureBindings,
  | 'createTemplate'
  | 'insertTemplate'
  | 'openSettings'
  | 'resetSettings'
  | 'showAutoPreviewSetting'
  | 'checkAutoPreviewSetting'
  | 'reinitializeSchemas'
  | 'debugSchemas'
> {
  return {
    createTemplate: () => deps.templateService.createTemplate(),
    insertTemplate: () => deps.templateService.insertTemplate(),
    openSettings: () => deps.settingsService.openSettings(),
    resetSettings: () => deps.settingsService.resetSettings(),
    showAutoPreviewSetting: () => deps.settingsService.showAutoPreviewSetting(),
    checkAutoPreviewSetting: async () => {
      const result = await ErrorHandler.executeSafely(async () => {
        const autoPreviewEnabled = ConfigManager.isAutoPreviewEnabled();
        const message = `自動プレビュー設定: ${autoPreviewEnabled ? 'ON' : 'OFF'}`;
        deps.logger.info(message);
        ErrorHandler.showInfo(message);
      }, '自動プレビュー設定の確認に失敗しました');

      if (!result) {
        return;
      }
    },
    reinitializeSchemas: () => deps.schemaManager.reinitialize(),
    debugSchemas: () => deps.schemaManager.debugSchemas()
  };
}

export function createCommandFeatureBindings(
  previewExport: ReturnType<typeof createPreviewExportFeatureRegistry>,
  authoring: ReturnType<typeof createAuthoringFeatureRegistry>,
  runtimeInspection: RuntimeInspectionCommandBindings
): CommandCatalogDependencies {
  return {
    ...previewExport,
    ...authoring,
    ...runtimeInspection
  };
}
