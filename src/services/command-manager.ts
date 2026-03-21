import * as vscode from 'vscode';
import { ErrorHandler } from '../utils/error-handler';
import { ConfigManager } from '../utils/config-manager';
import { RuntimeInspectionService } from './runtime-inspection-service';
import { Logger } from '../utils/logger';
import type {
  ICommandManager,
  IWebViewManager,
  IExportService,
  ITemplateService,
  ISettingsService,
  ISchemaManager,
  IThemeManager
} from '../types';
import { createCommandDefinitions, type CommandHandler } from './command-catalog';
import { executeOpenPreviewCommand } from './commands/open-preview-command';
import { executeCapturePreviewCommand } from './commands/capture-preview-command';
import { executeExportCommand } from './commands/export-command';

export interface CommandManagerDependencies {
  webViewManager: IWebViewManager;
  exportService: IExportService;
  templateService: ITemplateService;
  settingsService: ISettingsService;
  schemaManager: ISchemaManager;
  themeManager?: IThemeManager;
  runtimeInspectionService?: RuntimeInspectionService;
}


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
  private themeManager?: IThemeManager;
  private runtimeInspectionService: RuntimeInspectionService;
  private readonly logger = new Logger('CommandManager');
  private commandDisposables: vscode.Disposable[] = [];

  constructor(
    context: vscode.ExtensionContext,
    dependencies: CommandManagerDependencies
  ) {
    this.context = context;
    this.webViewManager = dependencies.webViewManager;
    this.exportService = dependencies.exportService;
    this.templateService = dependencies.templateService;
    this.settingsService = dependencies.settingsService;
    this.schemaManager = dependencies.schemaManager;
    this.themeManager = dependencies.themeManager;
    this.runtimeInspectionService = dependencies.runtimeInspectionService ?? new RuntimeInspectionService();
  }

  /**
   * コマンドを登録（定義は `command-catalog`＋`runtime-inspection-command-entries` に集約）。
   */
  registerCommands(): void {
    this.logger.info('コマンド登録を開始');

    const commandDefinitions = createCommandDefinitions({
      openPreviewWithCheck: () => this.openPreviewWithCheck(),
      capturePreviewImage: () => this.capturePreviewImage(),
      openDevTools: () => this.webViewManager.openDevTools(),
      executeExport: (filePath?: string) => executeExportCommand(this.exportService, filePath),
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

    this.logger.info('コマンド登録完了');
  }

  /**
   * 自動プレビュー設定を確認
   */
  private async checkAutoPreviewSetting(): Promise<void> {
    const result = await ErrorHandler.executeSafely(async () => {
      const autoPreviewEnabled = ConfigManager.isAutoPreviewEnabled();
      const message = `自動プレビュー設定: ${autoPreviewEnabled ? 'ON' : 'OFF'}`;
      this.logger.info(message);
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
    this.logger.debug(`コマンドを登録: ${command}`);
    const disposable = vscode.commands.registerCommand(command, callback);
    this.commandDisposables.push(disposable);
    this.context.subscriptions.push(disposable);
    this.logger.debug(`コマンド登録成功: ${command}`);
  }

  /**
   * CommandManagerが直接保持するリソースを解放
   */
  dispose(): void {
    this.commandDisposables.forEach(disposable => {
      try {
        disposable.dispose();
      } catch (error) {
        this.logger.warn('disposable解放時にエラーが発生しました:', error);
      }
    });
    this.commandDisposables = [];
  }

  /**
   * プレビューを開く（ユーザーの明示的な指示による実行）
   */
  private async openPreviewWithCheck(): Promise<void> {
    await executeOpenPreviewCommand(this.webViewManager, this.logger);
  }

  /**
   * 現在のプレビュー対象DSLをPNG画像として保存
   */
  private async capturePreviewImage(): Promise<void> {
    await executeCapturePreviewCommand({
      webViewManager: this.webViewManager,
      themeManager: this.themeManager,
      extensionPath: this.context.extensionPath,
      logger: this.logger
    });
  }
} 