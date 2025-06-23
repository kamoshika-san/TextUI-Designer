import * as vscode from 'vscode';
import { ConfigManager } from '../utils/config-manager';
import { ErrorHandler } from '../utils/error-handler';

/**
 * 設定管理を担当するサービス
 */
export class SettingsService {
  /**
   * 設定画面を開く
   */
  async openSettings(): Promise<void> {
    const result = await ErrorHandler.executeSafely(async () => {
      await vscode.commands.executeCommand('workbench.action.openSettings', 'textui-designer');
    }, '設定画面を開けませんでした');

    if (!result) {
      // エラーハンドリングは既にErrorHandlerで処理済み
      return;
    }
  }

  /**
   * 設定をリセット
   */
  async resetSettings(): Promise<void> {
    const result = await ErrorHandler.executeSafely(async () => {
      const confirmed = await vscode.window.showWarningMessage(
        'すべての設定をデフォルト値にリセットしますか？',
        { modal: true },
        'リセット'
      );

      if (confirmed === 'リセット') {
        await ConfigManager.resetConfiguration();
        ErrorHandler.showInfo('設定をリセットしました。');
      }
    }, '設定のリセットに失敗しました');

    if (!result) {
      // エラーハンドリングは既にErrorHandlerで処理済み
      return;
    }
  }

  /**
   * 現在の設定を表示
   */
  async showSettings(): Promise<void> {
    const result = await ErrorHandler.executeSafely(async () => {
      const settings = this.getCurrentSettings();
      const content = this.formatSettings(settings);
      
      const document = await vscode.workspace.openTextDocument({
        content,
        language: 'json'
      });

      await vscode.window.showTextDocument(document);
    }, '設定の表示に失敗しました');

    if (!result) {
      // エラーハンドリングは既にErrorHandlerで処理済み
      return;
    }
  }

  /**
   * 自動プレビュー設定を通知で表示
   */
  async showAutoPreviewSetting(): Promise<void> {
    const result = await ErrorHandler.executeSafely(async () => {
      const autoPreviewEnabled = ConfigManager.isAutoPreviewEnabled();
      const message = `自動プレビュー設定: ${autoPreviewEnabled ? 'ON' : 'OFF'}`;
      console.log(`[SettingsService] ${message}`);
      ErrorHandler.showInfo(message);
    }, '自動プレビュー設定の表示に失敗しました');

    if (!result) {
      // エラーハンドリングは既にErrorHandlerで処理済み
      return;
    }
  }

  /**
   * 現在の設定を取得
   */
  private getCurrentSettings(): Record<string, any> {
    return {
      supportedFileExtensions: ConfigManager.getSupportedFileExtensions(),
      autoPreview: {
        enabled: ConfigManager.isAutoPreviewEnabled()
      },
      devTools: {
        enabled: ConfigManager.isDevToolsEnabled()
      },
      webview: ConfigManager.getWebViewSettings(),
      export: ConfigManager.getExportSettings(),
      diagnostics: ConfigManager.getDiagnosticSettings(),
      schema: ConfigManager.getSchemaSettings(),
      templates: ConfigManager.getTemplateSettings()
    };
  }

  /**
   * 設定をフォーマット
   */
  private formatSettings(settings: Record<string, any>): string {
    return JSON.stringify(settings, null, 2);
  }

  /**
   * 設定変更の監視を開始
   */
  startWatching(callback: () => void): vscode.Disposable {
    return vscode.workspace.onDidChangeConfiguration(event => {
      if (event.affectsConfiguration('textui-designer')) {
        console.log('[SettingsService] TextUI Designer設定が変更されました');
        
        // 自動プレビュー設定の変更を詳細にログ出力
        if (event.affectsConfiguration('textui-designer.autoPreview.enabled')) {
          const newValue = ConfigManager.isAutoPreviewEnabled();
          console.log(`[SettingsService] 自動プレビュー設定が変更されました: ${newValue ? 'ON' : 'OFF'}`);
        }
        
        callback();
      }
    });
  }

  /**
   * 特定の設定が変更されたかどうかをチェック
   */
  hasConfigurationChanged(event: vscode.ConfigurationChangeEvent): boolean {
    return event.affectsConfiguration('textui-designer');
  }
} 