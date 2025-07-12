import * as vscode from 'vscode';
import { SchemaManager } from './schema-manager';
import { WebViewManager } from './webview-manager';
import { DiagnosticManager } from './diagnostic-manager';
import { TextUICompletionProvider } from './completion-provider';
import { TextUIDefinitionProvider } from './definition-provider';
import { CommandManager } from './command-manager';
import { ExportService } from './export-service';
import { TemplateService } from './template-service';
import { SettingsService } from './settings-service';
import { ExportManager } from '../exporters';
import { ThemeManager } from './theme-manager';
import { ErrorHandler } from '../utils/error-handler';
import { DIContainer, ServiceTokens } from '../utils/di-container';

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
  definitionProvider: TextUIDefinitionProvider;
  commandManager: CommandManager;
}

/**
 * サービスの初期化・管理
 * 各サービスの作成、初期化、クリーンアップを担当
 */
export class ServiceInitializer {
  private context: vscode.ExtensionContext;
  private services: ExtensionServices | null = null;
  private container: DIContainer;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.container = DIContainer.getInstance();
  }

  /**
   * 全サービスの初期化
   */
  async initialize(): Promise<ExtensionServices> {
    try {
      // DIコンテナにサービスを登録
      await this.registerServices();

      // サービスをDIコンテナから解決
      const schemaManager = this.container.resolve<SchemaManager>(ServiceTokens.SCHEMA_MANAGER);
      const themeManager = this.container.resolve<ThemeManager>(ServiceTokens.THEME_MANAGER);
      const webViewManager = this.container.resolve<WebViewManager>(ServiceTokens.WEBVIEW_MANAGER);
      const exportManager = this.container.resolve<ExportManager>(ServiceTokens.EXPORT_MANAGER);
      const exportService = this.container.resolve<ExportService>(ServiceTokens.EXPORT_SERVICE);
      const templateService = this.container.resolve<TemplateService>(ServiceTokens.TEMPLATE_SERVICE);
      const settingsService = this.container.resolve<SettingsService>(ServiceTokens.SETTINGS_SERVICE);
      const diagnosticManager = this.container.resolve<DiagnosticManager>(ServiceTokens.DIAGNOSTIC_MANAGER);
      const completionProvider = this.container.resolve<TextUICompletionProvider>(ServiceTokens.COMPLETION_PROVIDER);
      const definitionProvider = this.container.resolve<TextUIDefinitionProvider>(ServiceTokens.DEFINITION_PROVIDER);
      const commandManager = this.container.resolve<CommandManager>(ServiceTokens.COMMAND_MANAGER);

      // スキーマの初期化
      await schemaManager.initialize();

      // コマンドの登録
      commandManager.registerCommands();

      // テーマ読み込み
      await themeManager.loadTheme();
      webViewManager.applyThemeVariables(themeManager.generateCSSVariables());
      themeManager.watchThemeFile(css => {
        webViewManager.applyThemeVariables(css);
      });

      // サービスオブジェクトを作成
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
        definitionProvider,
        commandManager
      };

      return this.services;

    } catch (error) {
      throw error;
    }
  }

  /**
   * DIコンテナにサービスを登録
   */
  private async registerServices(): Promise<void> {
    // 基本サービスの登録
    this.container.register(ServiceTokens.ERROR_HANDLER, ErrorHandler);

    // SchemaManagerの登録
    this.container.registerFactory(ServiceTokens.SCHEMA_MANAGER, () => {
      return new SchemaManager(this.context);
    });

    // ThemeManagerの登録
    this.container.registerFactory(ServiceTokens.THEME_MANAGER, () => {
      return new ThemeManager(this.context);
    });

    // WebViewManagerの登録
    this.container.registerFactory(ServiceTokens.WEBVIEW_MANAGER, () => {
      const themeManager = this.container.resolve<ThemeManager>(ServiceTokens.THEME_MANAGER);
      return new WebViewManager(this.context, themeManager);
    });

    // ExportManagerの登録
    this.container.registerFactory(ServiceTokens.EXPORT_MANAGER, () => {
      return new ExportManager();
    });

    // ExportServiceの登録
    this.container.registerFactory(ServiceTokens.EXPORT_SERVICE, () => {
      const exportManager = this.container.resolve<ExportManager>(ServiceTokens.EXPORT_MANAGER);
      return new ExportService(exportManager);
    });

    // TemplateServiceの登録
    this.container.registerFactory(ServiceTokens.TEMPLATE_SERVICE, () => {
      return new TemplateService();
    });

    // SettingsServiceの登録
    this.container.registerFactory(ServiceTokens.SETTINGS_SERVICE, () => {
      return new SettingsService();
    });

    // DiagnosticManagerの登録
    this.container.registerFactory(ServiceTokens.DIAGNOSTIC_MANAGER, () => {
      const schemaManager = this.container.resolve<SchemaManager>(ServiceTokens.SCHEMA_MANAGER);
      return new DiagnosticManager(schemaManager);
    });

    // CompletionProviderの登録
    this.container.registerFactory(ServiceTokens.COMPLETION_PROVIDER, () => {
      const schemaManager = this.container.resolve<SchemaManager>(ServiceTokens.SCHEMA_MANAGER);
      return new TextUICompletionProvider(schemaManager);
    });

    // DefinitionProviderの登録
    this.container.registerFactory(ServiceTokens.DEFINITION_PROVIDER, () => {
      return new TextUIDefinitionProvider();
    });

    // CommandManagerの登録
    this.container.registerFactory(ServiceTokens.COMMAND_MANAGER, () => {
      const webViewManager = this.container.resolve<WebViewManager>(ServiceTokens.WEBVIEW_MANAGER);
      const exportService = this.container.resolve<ExportService>(ServiceTokens.EXPORT_SERVICE);
      const templateService = this.container.resolve<TemplateService>(ServiceTokens.TEMPLATE_SERVICE);
      const settingsService = this.container.resolve<SettingsService>(ServiceTokens.SETTINGS_SERVICE);
      const schemaManager = this.container.resolve<SchemaManager>(ServiceTokens.SCHEMA_MANAGER);
      const definitionProvider = this.container.resolve<TextUIDefinitionProvider>(ServiceTokens.DEFINITION_PROVIDER);
      
      return new CommandManager(
        this.context,
        webViewManager,
        exportService,
        templateService,
        settingsService,
        schemaManager,
        definitionProvider
      );
    });
  }

  /**
   * 全サービスのクリーンアップ
   */
  async cleanup(): Promise<void> {
    try {
      if (this.services) {
        // スキーマのクリーンアップ
        await this.services.schemaManager.cleanup();

        // 診断マネージャーのクリーンアップ
        this.services.diagnosticManager.clearCache();
        this.services.diagnosticManager.dispose();

        // テーママネージャーのクリーンアップ
        this.services.themeManager?.dispose?.();

        // DIコンテナのクリア
        this.container.clear();

        this.services = null;
      }
    } catch (error) {
      // エラーは静かに処理
    }
  }

  /**
   * サービスを取得
   */
  getServices(): ExtensionServices | null {
    return this.services;
  }
} 