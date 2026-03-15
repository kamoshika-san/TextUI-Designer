import * as fs from 'fs';
import * as vscode from 'vscode';
import * as path from 'path';
import { ErrorHandler } from '../utils/error-handler';
import { ConfigManager } from '../utils/config-manager';
import { RuntimeInspectionService } from './runtime-inspection-service';
import { capturePreviewImageFromDslFile } from '../utils/preview-capture';
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
   * コマンドを登録
   */
  registerCommands(): void {
    this.logger.info('コマンド登録を開始');

    const commandDefinitions = createCommandDefinitions({
      openPreviewWithCheck: () => this.openPreviewWithCheck(),
      capturePreviewImage: () => this.capturePreviewImage(),
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
    this.logger.debug('openPreviewWithCheck が呼び出されました');
    try {
      this.logger.debug('WebViewManager.openPreview を呼び出します');
      // ユーザーが明示的にコマンドを実行した場合は、Auto Preview設定に関係なくプレビューを開く
      await this.webViewManager.openPreview();
      this.logger.debug('WebViewManager.openPreview が完了しました');
    } catch (error) {
      this.logger.error('プレビュー表示エラー:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`プレビューの表示に失敗しました: ${errorMessage}`);
    }
  }

  /**
   * 現在のプレビュー対象DSLをPNG画像として保存
   */
  private async capturePreviewImage(): Promise<void> {
    const targetFile = this.resolveCaptureTargetFile();
    if (!targetFile) {
      vscode.window.showWarningMessage('キャプチャ対象の .tui.yml ファイルが見つかりません。');
      return;
    }

    const defaultFileName = `${path.basename(targetFile).replace(/\.tui\.ya?ml$/i, '')}.preview.png`;
    const defaultUri = vscode.Uri.file(path.join(path.dirname(targetFile), defaultFileName));
    const outputUri = await vscode.window.showSaveDialog({
      defaultUri,
      saveLabel: 'プレビュー画像を保存',
      filters: {
        PNG: ['png']
      }
    });

    if (!outputUri) {
      return;
    }

    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri?.fsPath;
    const cliSpawnPath = (workspaceFolder && fs.existsSync(path.join(workspaceFolder, 'out', 'cli', 'index.js')))
      ? workspaceFolder
      : undefined;

    try {
      await capturePreviewImageFromDslFile(targetFile, {
        outputPath: outputUri.fsPath,
        themePath: this.themeManager?.getThemePath(),
        extensionPath: this.context.extensionPath,
        cliSpawnPath,
        log: (msg) => this.logger.info(msg)
      });
      vscode.window.showInformationMessage(`プレビュー画像を出力しました: ${outputUri.fsPath}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`プレビュー画像の出力に失敗しました: ${message}`);
    }
  }

  private resolveCaptureTargetFile(): string | undefined {
    const activeFile = vscode.window.activeTextEditor?.document.fileName;
    if (activeFile && ConfigManager.isSupportedFile(activeFile)) {
      return activeFile;
    }

    const lastFile = this.webViewManager.getLastTuiFile();
    if (lastFile && ConfigManager.isSupportedFile(lastFile)) {
      return lastFile;
    }

    return undefined;
  }
} 