import * as vscode from 'vscode';
import { ConfigManager } from '../utils/config-manager';
import { ErrorHandler } from '../utils/error-handler';
import type { ConfigurationChangeEventLike, DisposableLike, ISettingsService } from '../types';
import { Logger } from '../utils/logger';

/**
 * 設定管理を担当するサービス
 */
export class SettingsService implements ISettingsService {
  private configManager: typeof ConfigManager;
  private errorHandler: typeof ErrorHandler;
  private readonly logger = new Logger('SettingsService');

  constructor(
    configManager: typeof ConfigManager = ConfigManager,
    errorHandler: typeof ErrorHandler = ErrorHandler
  ) {
    this.configManager = configManager;
    this.errorHandler = errorHandler;
  }

  /**
   * 設定画面を開く
   */
  async openSettings(): Promise<void> {
    const result = await this.errorHandler.executeSafely(async () => {
      await vscode.commands.executeCommand('workbench.action.openSettings', 'textui-designer');
    }, 'Could not open settings.');

    if (!result) {
      // エラーハンドリングは既にErrorHandlerで処理済み
      return;
    }
  }

  /**
   * 設定をリセット
   */
  async resetSettings(): Promise<void> {
    const result = await this.errorHandler.executeSafely(async () => {
      const confirmed = await vscode.window.showWarningMessage(
        'Reset all TextUI Designer settings to their defaults?',
        { modal: true },
        'Reset'
      );

      if (confirmed === 'Reset') {
        await this.configManager.resetConfiguration();
        this.errorHandler.showInfo('Settings have been reset.');
      }
    }, 'Failed to reset settings.');

    if (!result) {
      // エラーハンドリングは既にErrorHandlerで処理済み
      return;
    }
  }

  /**
   * 現在の設定を表示
   */
  async showSettings(): Promise<void> {
    const result = await this.errorHandler.executeSafely(async () => {
      const settings = this.getCurrentSettings();
      const content = this.formatSettings(settings);
      
      const document = await vscode.workspace.openTextDocument({
        content,
        language: 'json'
      });

      await vscode.window.showTextDocument(document);
    }, 'Failed to show settings.');

    if (!result) {
      // エラーハンドリングは既にErrorHandlerで処理済み
      return;
    }
  }

  /**
   * 自動プレビュー設定を通知で表示
   */
  async showAutoPreviewSetting(): Promise<void> {
    const result = await this.errorHandler.executeSafely(async () => {
      const autoPreviewEnabled = this.configManager.isAutoPreviewEnabled();
      const message = `Auto preview: ${autoPreviewEnabled ? 'ON' : 'OFF'}`;
      this.logger.info(message);
      this.errorHandler.showInfo(message);
    }, 'Failed to show auto preview setting.');

    if (!result) {
      // エラーハンドリングは既にErrorHandlerで処理済み
      return;
    }
  }

  /**
   * 現在の設定を取得
   */
  private getCurrentSettings(): Record<string, unknown> {
    return {
      supportedFileExtensions: this.configManager.getSupportedFileExtensions(),
      autoPreview: {
        enabled: this.configManager.isAutoPreviewEnabled()
      },
      devTools: {
        enabled: this.configManager.isDevToolsEnabled()
      },
      webview: this.configManager.getWebViewSettings(),
      export: this.configManager.getExportSettings(),
      diagnostics: this.configManager.getDiagnosticSettings(),
      schema: this.configManager.getSchemaSettings(),
      templates: this.configManager.getTemplateSettings()
    };
  }

  /**
   * 設定をフォーマット
   */
  private formatSettings(settings: Record<string, unknown>): string {
    return JSON.stringify(settings, null, 2);
  }

  /**
   * 設定変更の監視を開始
   */
  startWatching(callback: () => void): DisposableLike {
    return vscode.workspace.onDidChangeConfiguration(event => {
      if (event.affectsConfiguration('textui-designer')) {
        this.logger.info('TextUI Designer設定が変更されました');
        
        // 自動プレビュー設定の変更を詳細にログ出力
        if (event.affectsConfiguration('textui-designer.autoPreview.enabled')) {
          const newValue = this.configManager.isAutoPreviewEnabled();
          this.logger.info(`自動プレビュー設定が変更されました: ${newValue ? 'ON' : 'OFF'}`);
        }
        callback();
      }
    });
  }

  /**
   * 特定の設定が変更されたかどうかをチェック
   */
  hasConfigurationChanged(event: ConfigurationChangeEventLike): boolean {
    return event.affectsConfiguration('textui-designer');
  }
} 
