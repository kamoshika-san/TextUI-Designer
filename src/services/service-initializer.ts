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
    console.log('[ServiceInitializer] サービス初期化開始');

    try {
      // SchemaManagerの初期化
      console.log('[ServiceInitializer] SchemaManager を作成します');
      const schemaManager = new SchemaManager(this.context);
      console.log('[ServiceInitializer] SchemaManager 作成完了');

      // ThemeManagerの初期化
      console.log('[ServiceInitializer] ThemeManager を作成します');
      const themeManager = new ThemeManager(this.context);
      console.log('[ServiceInitializer] ThemeManager 作成完了');

      // WebViewManagerの初期化
      console.log('[ServiceInitializer] WebViewManager を作成します');
      const webViewManager = new WebViewManager(this.context, themeManager);
      console.log('[ServiceInitializer] WebViewManager 作成完了');

      // ExportManagerの初期化
      console.log('[ServiceInitializer] ExportManager を作成します');
      const exportManager = new ExportManager();
      const exportService = new ExportService(exportManager);
      console.log('[ServiceInitializer] ExportManager 作成完了');

      // TemplateServiceの初期化
      console.log('[ServiceInitializer] TemplateService を作成します');
      const templateService = new TemplateService();
      console.log('[ServiceInitializer] TemplateService 作成完了');

      // SettingsServiceの初期化
      console.log('[ServiceInitializer] SettingsService を作成します');
      const settingsService = new SettingsService();
      console.log('[ServiceInitializer] SettingsService 作成完了');

      // DiagnosticManagerの初期化
      console.log('[ServiceInitializer] DiagnosticManager を作成します');
      const diagnosticManager = new DiagnosticManager(schemaManager);
      console.log('[ServiceInitializer] DiagnosticManager 作成完了');

      // CompletionProviderの初期化
      console.log('[ServiceInitializer] CompletionProvider を作成します');
      const completionProvider = new TextUICompletionProvider(schemaManager);
      console.log('[ServiceInitializer] CompletionProvider 作成完了');

      // CommandManagerの初期化
      console.log('[ServiceInitializer] CommandManager を作成します');
      const commandManager = new CommandManager(
        this.context,
        webViewManager,
        exportService,
        templateService,
        settingsService,
        schemaManager
      );
      console.log('[ServiceInitializer] CommandManager 作成完了');

      // スキーマの初期化
      console.log('[ServiceInitializer] スキーマ初期化を開始します');
      await schemaManager.initialize();
      console.log('[ServiceInitializer] スキーマ初期化完了');

      // コマンドの登録
      console.log('[ServiceInitializer] CommandManager.registerCommands を呼び出します');
      commandManager.registerCommands();
      console.log('[ServiceInitializer] CommandManager.registerCommands が完了しました');

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