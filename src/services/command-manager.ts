import * as vscode from 'vscode';
import { WebViewManager } from './webview-manager';
import { ExportService } from './export-service';
import { TemplateService } from './template-service';
import { SettingsService } from './settings-service';
import { SchemaManager } from './schema-manager';
import { TextUIDefinitionProvider } from './definition-provider';
import { 
  PerformanceCommandHandler, 
  MemoryCommandHandler, 
  SettingsCommandHandler 
} from './command-decorators';
import { logger } from '../utils/logger';

/**
 * コマンド管理サービス
 * VS Code拡張のコマンド登録と実行を担当
 * 
 * リファクタリング後：各カテゴリーのコマンドハンドラーに責任を委譲
 */
export class CommandManager {
  private context: vscode.ExtensionContext;
  private webViewManager: WebViewManager;
  private exportService: ExportService;
  private templateService: TemplateService;
  private settingsService: SettingsService;
  private schemaManager: SchemaManager;
  private definitionProvider: TextUIDefinitionProvider;

  // 各カテゴリーのコマンドハンドラー
  private performanceHandler: PerformanceCommandHandler;
  private memoryHandler: MemoryCommandHandler;
  private settingsHandler: SettingsCommandHandler;

  constructor(
    context: vscode.ExtensionContext,
    webViewManager: WebViewManager,
    exportService: ExportService,
    templateService: TemplateService,
    settingsService: SettingsService,
    schemaManager: SchemaManager,
    definitionProvider: TextUIDefinitionProvider
  ) {
    this.context = context;
    this.webViewManager = webViewManager;
    this.exportService = exportService;
    this.templateService = templateService;
    this.settingsService = settingsService;
    this.schemaManager = schemaManager;
    this.definitionProvider = definitionProvider;

    // 各カテゴリーのコマンドハンドラーを初期化
    this.performanceHandler = new PerformanceCommandHandler();
    this.memoryHandler = new MemoryCommandHandler();
    this.settingsHandler = new SettingsCommandHandler();
  }

  /**
   * 言語機能を登録
   */
  private registerLanguageFeatures(): void {
    // DefinitionProviderを登録
    const definitionProvider = vscode.languages.registerDefinitionProvider(
      { scheme: 'file', pattern: '**/*.tui.yml' },
      this.definitionProvider
    );
    
    this.context.subscriptions.push(definitionProvider);
  }

  /**
   * コマンドを登録
   */
  registerCommands(): void {
    logger.info('コマンド登録を開始');
    
    // 言語機能の登録
    this.registerLanguageFeatures();
    
    // プレビュー関連
    this.registerCommand('textui-designer.openPreview', () => this.openPreviewWithCheck());
    this.registerCommand('textui-designer.openDevTools', () => this.webViewManager.openDevTools());

    // エクスポート関連
    this.registerCommand('textui-designer.export', (filePath?: string) => this.exportService.executeExport(filePath));

    // テンプレート関連
    this.registerCommand('textui-designer.createTemplate', () => this.templateService.createTemplate());
    this.registerCommand('textui-designer.insertTemplate', () => this.templateService.insertTemplate());

    // 設定関連（従来のSettingsServiceとの組み合わせ）
    this.registerCommand('textui-designer.openSettings', () => this.settingsService.openSettings());
    this.registerCommand('textui-designer.resetSettings', () => this.settingsService.resetSettings());
    this.registerCommand('textui-designer.showSettings', () => this.settingsService.showAutoPreviewSetting());
    this.registerCommand('textui-designer.checkAutoPreviewSetting', () => this.settingsHandler.checkAutoPreviewSetting());
    this.registerCommand('textui-designer.showSettingsOverview', () => this.settingsHandler.showSettingsOverview());

    // スキーマ関連
    this.registerCommand('textui-designer.reinitializeSchemas', () => this.schemaManager.reinitialize());
    
    // デバッグコマンド（開発環境または設定で有効な場合のみ登録）
    if (logger.isDebugCommandsEnabled()) {
      this.registerCommand('textui-designer.debugSchemas', () => this.schemaManager.debugSchemas());
      logger.debug('デバッグコマンドを登録しました');
    }

    // パフォーマンス関連（新しいハンドラーに委譲）
    this.registerCommand('textui-designer.showPerformanceReport', () => this.performanceHandler.showPerformanceReport());
    this.registerCommand('textui-designer.clearPerformanceMetrics', () => this.performanceHandler.clearPerformanceMetrics());
    this.registerCommand('textui-designer.togglePerformanceMonitoring', () => this.performanceHandler.togglePerformanceMonitoring());
    this.registerCommand('textui-designer.enablePerformanceMonitoring', () => this.performanceHandler.enablePerformanceMonitoring());
    this.registerCommand('textui-designer.generateSampleEvents', () => this.performanceHandler.generateSampleEvents());
    
    // メモリ追跡関連（新しいハンドラーに委譲）
    this.registerCommand('textui-designer.showMemoryReport', () => this.memoryHandler.showMemoryReport());
    this.registerCommand('textui-designer.toggleMemoryTracking', () => this.memoryHandler.toggleMemoryTracking());
    this.registerCommand('textui-designer.enableMemoryTracking', () => this.memoryHandler.enableMemoryTracking());
    
    logger.info('コマンド登録完了');
  }

  /**
   * コマンドを登録
   */
  private registerCommand(command: string, callback: (...args: any[]) => void): void {
    logger.debug(`コマンドを登録: ${command}`);
    const disposable = vscode.commands.registerCommand(command, callback);
    this.context.subscriptions.push(disposable);
    logger.debug(`コマンド登録成功: ${command}`);
  }

  /**
   * プレビューを開く（ユーザーの明示的な指示による実行）
   */
  private async openPreviewWithCheck(): Promise<void> {
    logger.debug('openPreviewWithCheck が呼び出されました');
    try {
      logger.debug('WebViewManager.openPreview を呼び出します');
      // ユーザーが明示的にコマンドを実行した場合は、Auto Preview設定に関係なくプレビューを開く
      await this.webViewManager.openPreview();
      logger.debug('WebViewManager.openPreview が完了しました');
    } catch (error) {
      logger.error('プレビュー表示エラー:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`プレビューの表示に失敗しました: ${errorMessage}`);
    }
  }
} 