import * as vscode from 'vscode';
import { ErrorHandler } from '../utils/error-handler';
import { ConfigManager } from '../utils/config-manager';
import { RuntimeInspectionService } from './runtime-inspection-service';
import type {
  ICommandManager,
  IWebViewManager,
  IExportService,
  ITemplateService,
  ISettingsService,
  ISchemaManager
} from '../types';
import { createCommandDefinitions, type CommandHandler } from './command-catalog';

/**
 * コマンド管理サービス
 * VS Code拡張のコマンド登録と実行を担当
 */
export class CommandManager implements ICommandManager {
  private context: vscode.ExtensionContext;
  private webViewManager: IWebViewManager;
  private exportService: IExportService;
  private templateService: ITemplateService;
  private settingsService: ISettingsService;
  private schemaManager: ISchemaManager;
  private runtimeInspectionService: RuntimeInspectionService;
  private commandDisposables: vscode.Disposable[] = [];

  constructor(
    context: vscode.ExtensionContext,
    webViewManager: IWebViewManager,
    exportService: IExportService,
    templateService: ITemplateService,
    settingsService: ISettingsService,
    schemaManager: ISchemaManager
  ) {
    this.context = context;
    this.webViewManager = webViewManager;
    this.exportService = exportService;
    this.templateService = templateService;
    this.settingsService = settingsService;
    this.schemaManager = schemaManager;
    this.runtimeInspectionService = new RuntimeInspectionService();
  }

  /**
   * コマンドを登録
   */
  registerCommands(): void {
    console.log('[CommandManager] コマンド登録を開始');

    const commandDefinitions = createCommandDefinitions({
      openPreviewWithCheck: () => this.openPreviewWithCheck(),
      openDevTools: () => this.webViewManager.openDevTools(),
      executeExport: (filePath?: string) => this.exportService.executeExport(filePath),
      createTemplate: () => this.templateService.createTemplate(),
      insertTemplate: () => this.templateService.insertTemplate(),
      openSettings: () => this.settingsService.openSettings(),
      resetSettings: () => this.settingsService.resetSettings(),
      showAutoPreviewSetting: () => this.settingsService.showAutoPreviewSetting(),
      checkAutoPreviewSetting: () => this.checkAutoPreviewSetting(),
      reinitializeSchemas: () => this.schemaManager.reinitialize(),
      debugSchemas: () => this.schemaManager.debugSchemas(),
      showPerformanceReport: () => this.runtimeInspectionService.showPerformanceReport(),
      clearPerformanceMetrics: () => this.runtimeInspectionService.clearPerformanceMetrics(),
      togglePerformanceMonitoring: () => this.runtimeInspectionService.togglePerformanceMonitoring(),
      enablePerformanceMonitoring: () => this.runtimeInspectionService.enablePerformanceMonitoring(),
      generateSampleEvents: () => this.runtimeInspectionService.generateSampleEvents(),
      showMemoryReport: () => this.runtimeInspectionService.showMemoryReport(),
      toggleMemoryTracking: () => this.runtimeInspectionService.toggleMemoryTracking(),
      enableMemoryTracking: () => this.runtimeInspectionService.enableMemoryTracking()
    });

    for (const { command, callback } of commandDefinitions) {
      this.registerCommand(command, callback);
    }

    console.log('[CommandManager] コマンド登録完了');
  }

  /**
   * 自動プレビュー設定を確認
   */
  private async checkAutoPreviewSetting(): Promise<void> {
    const result = await ErrorHandler.executeSafely(async () => {
      const autoPreviewEnabled = ConfigManager.isAutoPreviewEnabled();
      const message = `自動プレビュー設定: ${autoPreviewEnabled ? 'ON' : 'OFF'}`;
      console.log(`[CommandManager] ${message}`);
      ErrorHandler.showInfo(message);
    }, '自動プレビュー設定の確認に失敗しました');

    if (!result) {
      // エラーハンドリングは既にErrorHandlerで処理済み
      return;
    }
  }

  /**
   * コマンドを登録
   */
  private registerCommand(command: string, callback: CommandHandler): void {
    console.log(`[CommandManager] コマンドを登録: ${command}`);
    const disposable = vscode.commands.registerCommand(command, callback);
    this.commandDisposables.push(disposable);
    this.context.subscriptions.push(disposable);
    console.log(`[CommandManager] コマンド登録成功: ${command}`);
  }

  /**
   * CommandManagerが直接保持するリソースを解放
   */
  dispose(): void {
    this.commandDisposables.forEach(disposable => {
      try {
        disposable.dispose();
      } catch (error) {
        console.warn('[CommandManager] disposable解放時にエラーが発生しました:', error);
      }
    });
    this.commandDisposables = [];
  }

  /**
   * プレビューを開く（ユーザーの明示的な指示による実行）
   */
  private async openPreviewWithCheck(): Promise<void> {
    console.log('[CommandManager] openPreviewWithCheck が呼び出されました');
    try {
      console.log('[CommandManager] WebViewManager.openPreview を呼び出します');
      // ユーザーが明示的にコマンドを実行した場合は、Auto Preview設定に関係なくプレビューを開く
      await this.webViewManager.openPreview();
      console.log('[CommandManager] WebViewManager.openPreview が完了しました');
    } catch (error) {
      console.error('[CommandManager] プレビュー表示エラー:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`プレビューの表示に失敗しました: ${errorMessage}`);
    }
  }
} 