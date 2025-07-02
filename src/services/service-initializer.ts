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
 * サービスの初期化・管理
 * 各サービスの作成、初期化、クリーンアップを担当
 */
export class ServiceInitializer {
  private context: vscode.ExtensionContext;
  private services: ExtensionServices | null = null;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  /**
   * 全サービスの初期化
   */
  async initialize(): Promise<ExtensionServices> {
    try {
      // SchemaManagerの初期化
      const schemaManager = new SchemaManager(this.context);

      // ThemeManagerの初期化
      const themeManager = new ThemeManager(this.context);

      // WebViewManagerの初期化
      const webViewManager = new WebViewManager(this.context, themeManager);

      // ExportManagerの初期化
      const exportManager = new ExportManager();
      const exportService = new ExportService(exportManager);

      // TemplateServiceの初期化
      const templateService = new TemplateService();

      // SettingsServiceの初期化
      const settingsService = new SettingsService();

      // DiagnosticManagerの初期化
      const diagnosticManager = new DiagnosticManager(schemaManager);

      // CompletionProviderの初期化
      const completionProvider = new TextUICompletionProvider(schemaManager);

      // CommandManagerの初期化
      const commandManager = new CommandManager(
        this.context,
        webViewManager,
        exportService,
        templateService,
        settingsService,
        schemaManager
      );

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

      // グローバル変数として保存（後方互換性のため）
      (global as any).globalSchemaManager = schemaManager;

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
        commandManager
      };

      return this.services;

    } catch (error) {
      throw error;
    }
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

        // グローバル変数のクリア
        (global as any).globalSchemaManager = undefined;

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