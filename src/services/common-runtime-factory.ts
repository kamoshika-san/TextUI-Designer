import { ExportService } from './export-service';
import { RuntimeInspectionService } from './runtime-inspection-service';
import { createRuntimeInspectionCommandBindings } from './runtime-inspection-command-bindings';
import type { RuntimeInspectionCommandBindings } from './runtime-inspection-command-bindings';
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

export interface ServiceFactoryResult {
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

export interface CommonRuntimeBindings {
  extensionPath: string;
  createSchemaManager(): ISchemaManager;
  createThemeManager(): IThemeManager;
  createWebViewManager(themeManager: IThemeManager, schemaManager: ISchemaManager): IWebViewManager;
  createExportManager(): IExportManager;
  createTemplateService(): ITemplateService;
  createSettingsService(): ISettingsService;
  createDiagnosticManager(schemaManager: ISchemaManager): IDiagnosticManager;
  createCompletionProvider(schemaManager: ISchemaManager): ICompletionProvider;
  createCommandManager(deps: {
    webViewManager: IWebViewManager;
    exportService: IExportService;
    templateService: ITemplateService;
    settingsService: ISettingsService;
    schemaManager: ISchemaManager;
    themeManager?: IThemeManager;
    runtimeInspection?: RuntimeInspectionCommandBindings;
  }): ICommandManager;
}

export function createApplicationRuntime(bindings: CommonRuntimeBindings): ServiceFactoryResult {
  const schemaManager = bindings.createSchemaManager();
  const themeManager = bindings.createThemeManager();
  const webViewManager = bindings.createWebViewManager(themeManager, schemaManager);

  const exportManager = bindings.createExportManager();
  const exportService: IExportService = new ExportService(exportManager, themeManager, bindings.extensionPath);
  const templateService = bindings.createTemplateService();
  const settingsService = bindings.createSettingsService();
  const diagnosticManager = bindings.createDiagnosticManager(schemaManager);
  const completionProvider = bindings.createCompletionProvider(schemaManager);

  const runtimeInspectionService = new RuntimeInspectionService();
  const commandManager = bindings.createCommandManager({
    webViewManager,
    exportService,
    templateService,
    settingsService,
    schemaManager,
    themeManager,
    runtimeInspection: createRuntimeInspectionCommandBindings(runtimeInspectionService)
  });

  return {
    schemaManager,
    themeManager,
    webViewManager,
    exportManager,
    exportService,
    templateService,
    settingsService,
    diagnosticManager,
    completionProvider,
    commandManager
  };
}

/**
 * @deprecated Use createApplicationRuntime instead.
 */
export function createCommonRuntime(bindings: CommonRuntimeBindings): ServiceFactoryResult {
  return createApplicationRuntime(bindings);
}
