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
import { DIContainer, ServiceTokens, ServiceProvider } from '../utils/di-container';
import { logger } from '../utils/logger';

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
 * サービス初期化の抽象基底クラス
 */
abstract class ServiceInitializerBase {
  protected context: vscode.ExtensionContext;
  protected container: DIContainer;
  protected serviceProvider: ServiceProvider;

  constructor(context: vscode.ExtensionContext, container: DIContainer) {
    this.context = context;
    this.container = container;
    this.serviceProvider = new ServiceProvider(container);
  }

  abstract registerServices(): Promise<void>;
  abstract initializeServices(): Promise<void>;
  abstract cleanupServices(): Promise<void>;
}

/**
 * コアサービス初期化
 */
class CoreServiceInitializer extends ServiceInitializerBase {
  async registerServices(): Promise<void> {
    // 基本サービスの登録
    this.container.register(ServiceTokens.ERROR_HANDLER, ErrorHandler);
    
    // 設定サービス
    this.container.registerFactory(ServiceTokens.SETTINGS_SERVICE, () => {
      return new SettingsService();
    });

    // テンプレートサービス
    this.container.registerFactory(ServiceTokens.TEMPLATE_SERVICE, () => {
      return new TemplateService();
    });
  }

  async initializeServices(): Promise<void> {
    // 基本サービスの初期化
    const settingsService = this.container.resolve<SettingsService>(ServiceTokens.SETTINGS_SERVICE);
    await settingsService.initialize();
  }

  async cleanupServices(): Promise<void> {
    // 基本サービスのクリーンアップ
  }
}

/**
 * スキーマサービス初期化
 */
class SchemaServiceInitializer extends ServiceInitializerBase {
  async registerServices(): Promise<void> {
    // SchemaManagerの登録
    this.container.registerFactory(ServiceTokens.SCHEMA_MANAGER, () => {
      return new SchemaManager(this.context);
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
  }

  async initializeServices(): Promise<void> {
    // スキーマの初期化
    const schemaManager = this.container.resolve<SchemaManager>(ServiceTokens.SCHEMA_MANAGER);
    await schemaManager.initialize();
  }

  async cleanupServices(): Promise<void> {
    // スキーマのクリーンアップ
    const schemaManager = this.container.resolve<SchemaManager>(ServiceTokens.SCHEMA_MANAGER);
    await schemaManager.cleanup();

    const diagnosticManager = this.container.resolve<DiagnosticManager>(ServiceTokens.DIAGNOSTIC_MANAGER);
    diagnosticManager.clearCache();
    diagnosticManager.dispose();
  }
}

/**
 * UIサービス初期化
 */
class UIServiceInitializer extends ServiceInitializerBase {
  async registerServices(): Promise<void> {
    // ThemeManagerの登録
    this.container.registerFactory(ServiceTokens.THEME_MANAGER, () => {
      return new ThemeManager(this.context);
    });

    // WebViewManagerの登録
    this.container.registerFactory(ServiceTokens.WEBVIEW_MANAGER, () => {
      const themeManager = this.container.resolve<ThemeManager>(ServiceTokens.THEME_MANAGER);
      return new WebViewManager(this.context, themeManager);
    });
  }

  async initializeServices(): Promise<void> {
    // テーマ読み込み
    const themeManager = this.container.resolve<ThemeManager>(ServiceTokens.THEME_MANAGER);
    const webViewManager = this.container.resolve<WebViewManager>(ServiceTokens.WEBVIEW_MANAGER);
    
    await themeManager.loadTheme();
    webViewManager.applyThemeVariables(themeManager.generateCSSVariables());
    
    themeManager.watchThemeFile(css => {
      webViewManager.applyThemeVariables(css);
    });
  }

  async cleanupServices(): Promise<void> {
    // UIサービスのクリーンアップ
    const themeManager = this.container.resolve<ThemeManager>(ServiceTokens.THEME_MANAGER);
    themeManager?.dispose?.();
  }
}

/**
 * エクスポートサービス初期化
 */
class ExportServiceInitializer extends ServiceInitializerBase {
  async registerServices(): Promise<void> {
    // ExportManagerの登録
    this.container.registerFactory(ServiceTokens.EXPORT_MANAGER, () => {
      return new ExportManager();
    });

    // ExportServiceの登録
    this.container.registerFactory(ServiceTokens.EXPORT_SERVICE, () => {
      const exportManager = this.container.resolve<ExportManager>(ServiceTokens.EXPORT_MANAGER);
      return new ExportService(exportManager);
    });
  }

  async initializeServices(): Promise<void> {
    // エクスポートサービスの初期化
  }

  async cleanupServices(): Promise<void> {
    // エクスポートサービスのクリーンアップ
  }
}

/**
 * コマンドサービス初期化
 */
class CommandServiceInitializer extends ServiceInitializerBase {
  async registerServices(): Promise<void> {
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

  async initializeServices(): Promise<void> {
    // コマンドの登録
    const commandManager = this.container.resolve<CommandManager>(ServiceTokens.COMMAND_MANAGER);
    commandManager.registerCommands();
  }

  async cleanupServices(): Promise<void> {
    // コマンドのクリーンアップ
    const commandManager = this.container.resolve<CommandManager>(ServiceTokens.COMMAND_MANAGER);
    commandManager.dispose();
  }
}

/**
 * サービスの初期化・管理
 * 各サービスの作成、初期化、クリーンアップを担当
 * 責任を分離した複数の初期化クラスに委譲
 */
export class ServiceInitializer {
  private context: vscode.ExtensionContext;
  private container: DIContainer;
  private services: ExtensionServices | null = null;
  private initializers: ServiceInitializerBase[];

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.container = new DIContainer();
    
    // 各カテゴリーの初期化クラスを作成
    this.initializers = [
      new CoreServiceInitializer(context, this.container),
      new SchemaServiceInitializer(context, this.container),
      new UIServiceInitializer(context, this.container),
      new ExportServiceInitializer(context, this.container),
      new CommandServiceInitializer(context, this.container)
    ];
  }

  /**
   * 全サービスの初期化
   */
  async initialize(): Promise<ExtensionServices> {
    try {
      logger.info('サービス初期化を開始');

      // 各初期化クラスでサービスを登録
      for (const initializer of this.initializers) {
        await initializer.registerServices();
      }

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

      // 各初期化クラスでサービスを初期化
      for (const initializer of this.initializers) {
        await initializer.initializeServices();
      }

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

      logger.info('サービス初期化完了');
      return this.services;

    } catch (error) {
      logger.error('サービス初期化中にエラーが発生しました:', error);
      throw error;
    }
  }

  /**
   * 全サービスのクリーンアップ
   */
  async cleanup(): Promise<void> {
    try {
      logger.info('サービスクリーンアップを開始');

      if (this.services) {
        // 各初期化クラスでサービスをクリーンアップ
        for (const initializer of this.initializers) {
          await initializer.cleanupServices();
        }

        // DIコンテナのクリア
        await this.container.cleanup();

        this.services = null;
      }

      logger.info('サービスクリーンアップ完了');

    } catch (error) {
      logger.error('サービスクリーンアップ中にエラーが発生しました:', error);
    }
  }

  /**
   * サービスを取得
   */
  getServices(): ExtensionServices | null {
    return this.services;
  }

  /**
   * DIコンテナを取得
   */
  getContainer(): DIContainer {
    return this.container;
  }
} 