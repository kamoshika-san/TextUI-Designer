import * as vscode from 'vscode';
import { SchemaManager } from './schema-manager';
import { WebViewManager } from './webview-manager';
import { CommandManager } from './command-manager';
import { ExportService } from './export-service';
import { TemplateService } from './template-service';
import { SettingsService } from './settings-service';
import { ExportManager } from '../exporters';
import { ThemeManager } from './theme-manager';
import { DiagnosticManager } from './diagnostic-manager';
import { TextUICompletionProvider } from './completion-provider';
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
import type { ServiceFactoryOverrides } from './service-initializer';

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

export class ServiceFactory {
  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly factoryOverrides: ServiceFactoryOverrides
  ) {}

  create(): ServiceFactoryResult {
    const f = this.factoryOverrides;

    const schemaManager: ISchemaManager = f.createSchemaManager
      ? f.createSchemaManager(this.context)
      : new SchemaManager(this.context);
    const themeManager: IThemeManager = f.createThemeManager
      ? f.createThemeManager(this.context)
      : new ThemeManager(this.context);

    const webViewManager: IWebViewManager = f.createWebViewManager
      ? f.createWebViewManager(this.context, themeManager, schemaManager)
      : new WebViewManager(this.context, themeManager, schemaManager);

    const exportManager: IExportManager = f.createExportManager
      ? f.createExportManager()
      : new ExportManager();
    const exportService: IExportService = new ExportService(exportManager, themeManager, this.context.extensionPath);

    const templateService: ITemplateService = f.createTemplateService
      ? f.createTemplateService()
      : new TemplateService();

    const settingsService: ISettingsService = f.createSettingsService
      ? f.createSettingsService()
      : new SettingsService();

    const diagnosticManager: IDiagnosticManager = f.createDiagnosticManager
      ? f.createDiagnosticManager(schemaManager)
      : new DiagnosticManager(schemaManager);

    const completionProvider: ICompletionProvider = f.createCompletionProvider
      ? f.createCompletionProvider(schemaManager)
      : new TextUICompletionProvider();

    const commandManagerDependencies = {
      webViewManager,
      exportService,
      templateService,
      settingsService,
      schemaManager,
      themeManager
    };

    const commandManager: ICommandManager = f.createCommandManager
      ? f.createCommandManager(this.context, commandManagerDependencies)
      : new CommandManager(this.context, commandManagerDependencies);

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
}
