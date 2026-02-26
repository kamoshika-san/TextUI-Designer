import * as vscode from 'vscode';
import { SchemaManager } from './schema-manager';
import { WebViewManager } from './webview-manager';
import { DiagnosticManager } from './diagnostic-manager';
import { TextUICompletionProvider } from './completion-provider';
import { CommandManager } from './command-manager';
import { ExportService } from './export-service';
import { TemplateService } from './template-service';
import { SettingsService } from './settings-service';
import { ExportManager } from '../exporters';
import { ThemeManager } from './theme-manager';
import { ErrorHandler } from '../utils/error-handler';

export interface ExtensionServices {
  schemaManager: SchemaManager;
  themeManager: ThemeManager;
  webViewManager: WebViewManager;
  exportManager: ExportManager;
  exportService: ExportService;
  templateService: TemplateService;
  settingsService: SettingsService;
  diagnosticManager: DiagnosticManager;
  completionProvider: TextUICompletionProvider;
  commandManager: CommandManager;
}

/**
 * サービスファクトリーのオーバーライド
 * テスト時やカスタム構成でサービスの生成を差し替えるための型
 */
export interface ServiceFactoryOverrides {
  createSchemaManager?: (context: vscode.ExtensionContext) => SchemaManager;
  createThemeManager?: (context: vscode.ExtensionContext) => ThemeManager;
  createWebViewManager?: (
    context: vscode.ExtensionContext,
    themeManager: ThemeManager,
    schemaManager: SchemaManager
  ) => WebViewManager;
  createExportManager?: () => ExportManager;
  createTemplateService?: () => TemplateService;
  createSettingsService?: () => SettingsService;
}

/**
 * サービスの初期化・管理
 * 各サービスの作成、初期化、クリーンアップを担当
 * ファクトリーオーバーライドにより、テスト時のモック注入やカスタム構成が可能
 */
export class ServiceInitializer {
  private context: vscode.ExtensionContext;
  private services: ExtensionServices | null = null;
  private factoryOverrides: ServiceFactoryOverrides;

  constructor(context: vscode.ExtensionContext, factoryOverrides?: ServiceFactoryOverrides) {
    this.context = context;
    this.factoryOverrides = factoryOverrides || {};
  }

  /**
   * 全サービスの初期化
   */
  async initialize(): Promise<ExtensionServices> {
    console.log('[ServiceInitializer] サービス初期化開始');

    try {
      const f = this.factoryOverrides;

      const schemaManager = f.createSchemaManager
        ? f.createSchemaManager(this.context)
        : new SchemaManager(this.context);
      const themeManager = f.createThemeManager
        ? f.createThemeManager(this.context)
        : new ThemeManager(this.context);

      const webViewManager = f.createWebViewManager
        ? f.createWebViewManager(this.context, themeManager, schemaManager)
        : new WebViewManager(this.context, themeManager, schemaManager);

      const exportManager = f.createExportManager
        ? f.createExportManager()
        : new ExportManager();
      const exportService = new ExportService(exportManager);

      const templateService = f.createTemplateService
        ? f.createTemplateService()
        : new TemplateService();

      const settingsService = f.createSettingsService
        ? f.createSettingsService()
        : new SettingsService();

      const diagnosticManager = new DiagnosticManager(schemaManager);
      const completionProvider = new TextUICompletionProvider(schemaManager);

      const commandManager = new CommandManager(
        this.context,
        webViewManager,
        exportService,
        templateService,
        settingsService,
        schemaManager
      );

      await schemaManager.initialize();
      commandManager.registerCommands();

      await themeManager.loadTheme();
      webViewManager.applyThemeVariables(themeManager.generateCSSVariables());
      themeManager.watchThemeFile(css => {
        webViewManager.applyThemeVariables(css);
      });

      this.services = {
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

      console.log('[ServiceInitializer] 全サービス初期化完了');
      return this.services;

    } catch (error) {
      console.error('[ServiceInitializer] サービス初期化中にエラーが発生しました:', error);
      throw error;
    }
  }

  /**
   * 全サービスのクリーンアップ
   */
  async cleanup(): Promise<void> {
    console.log('[ServiceInitializer] サービスクリーンアップ開始');

    try {
      if (this.services) {
        await this.services.schemaManager.cleanup();

        this.services.diagnosticManager.clearCache();
        this.services.diagnosticManager.dispose();

        this.services.themeManager?.dispose?.();

        this.services = null;
      }

      console.log('[ServiceInitializer] サービスクリーンアップ完了');

    } catch (error) {
      console.error('[ServiceInitializer] サービスクリーンアップ中にエラーが発生しました:', error);
    }
  }

  /**
   * サービスを取得
   */
  getServices(): ExtensionServices | null {
    return this.services;
  }
} 