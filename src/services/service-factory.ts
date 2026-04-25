import * as vscode from 'vscode';
import { SchemaManager } from './schema-manager';
import { WebViewManager } from './webview-manager';
import { CommandManager } from './command-manager';
import { TemplateService } from './template-service';
import { SettingsService } from './settings-service';
import { ExportManager } from '../exporters';
import { ThemeManager } from './theme-manager';
import { DiagnosticManager } from './diagnostic-manager';
import { TextUICompletionProvider } from './completion-provider';
import {
  createApplicationRuntime,
  type ServiceFactoryResult,
  type CommonRuntimeBindings
} from './common-runtime-factory';
import type {
  ISchemaManager,
  IThemeManager,
  IWebViewManager,
  IExportManager,
  ITemplateService,
  ISettingsService,
  IDiagnosticManager,
  ICompletionProvider
} from '../types';
import type { ServiceFactoryOverrides } from './service-initializer';

export interface VscodeServiceBindings {
  context: vscode.ExtensionContext;
  factoryOverrides: ServiceFactoryOverrides;
}

export function createVscodeBindings(
  context: vscode.ExtensionContext,
  factoryOverrides: ServiceFactoryOverrides
): CommonRuntimeBindings {
  const f = factoryOverrides;
  return {
    extensionPath: context.extensionPath,
    createSchemaManager: (): ISchemaManager =>
      f.createSchemaManager ? f.createSchemaManager(context) : new SchemaManager(context),
    createThemeManager: (): IThemeManager =>
      f.createThemeManager ? f.createThemeManager(context) : new ThemeManager(context),
    createWebViewManager: (themeManager: IThemeManager, schemaManager: ISchemaManager): IWebViewManager =>
      f.createWebViewManager
        ? f.createWebViewManager(context, themeManager, schemaManager)
        : new WebViewManager(context, themeManager, schemaManager),
    createExportManager: (): IExportManager =>
      f.createExportManager ? f.createExportManager() : new ExportManager(),
    createTemplateService: (): ITemplateService =>
      f.createTemplateService ? f.createTemplateService() : new TemplateService(),
    createSettingsService: (): ISettingsService =>
      f.createSettingsService ? f.createSettingsService() : new SettingsService(),
    createDiagnosticManager: (schemaManager: ISchemaManager): IDiagnosticManager =>
      f.createDiagnosticManager ? f.createDiagnosticManager(schemaManager) : new DiagnosticManager(schemaManager),
    createCompletionProvider: (_schemaManager: ISchemaManager): ICompletionProvider =>
      f.createCompletionProvider ? f.createCompletionProvider(_schemaManager) : new TextUICompletionProvider(),
    createCommandManager: (deps) =>
      f.createCommandManager
        ? f.createCommandManager(context, deps)
        : new CommandManager(context, deps)
  };
}

export class ServiceFactory {
  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly factoryOverrides: ServiceFactoryOverrides
  ) {}

  create(): ServiceFactoryResult {
    return createApplicationRuntime(
      createVscodeBindings(this.context, this.factoryOverrides)
    );
  }
}
