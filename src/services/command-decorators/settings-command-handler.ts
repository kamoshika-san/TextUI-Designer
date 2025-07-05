import { SafeCommand } from './safe-command-decorator';
import { ConfigManager } from '../../utils/config-manager';
import { ErrorHandler } from '../../utils/error-handler';

/**
 * 設定関連のコマンドハンドラー
 */
export class SettingsCommandHandler {

  /**
   * 自動プレビュー設定を確認
   */
  @SafeCommand({
    errorMessage: '自動プレビュー設定の確認に失敗しました'
  })
  async checkAutoPreviewSetting(): Promise<void> {
    const autoPreviewEnabled = ConfigManager.isAutoPreviewEnabled();
    const message = `自動プレビュー設定: ${autoPreviewEnabled ? 'ON' : 'OFF'}`;
    console.log(`[SettingsCommandHandler] ${message}`);
    ErrorHandler.showInfo(message);
  }

  /**
   * 自動プレビュー設定を有効化
   */
  @SafeCommand({
    errorMessage: '自動プレビュー設定の有効化に失敗しました',
    successMessage: '自動プレビューを有効化しました'
  })
  async enableAutoPreview(): Promise<void> {
    await ConfigManager.set('autoPreview.enabled', true);
  }

  /**
   * 自動プレビュー設定を無効化
   */
  @SafeCommand({
    errorMessage: '自動プレビュー設定の無効化に失敗しました',
    successMessage: '自動プレビューを無効化しました'
  })
  async disableAutoPreview(): Promise<void> {
    await ConfigManager.set('autoPreview.enabled', false);
  }

  /**
   * 自動プレビュー設定を切り替え
   */
  @SafeCommand({
    errorMessage: '自動プレビュー設定の切り替えに失敗しました'
  })
  async toggleAutoPreview(): Promise<void> {
    const currentEnabled = ConfigManager.isAutoPreviewEnabled();
    const newEnabled = !currentEnabled;
    
    await ConfigManager.set('autoPreview.enabled', newEnabled);
    
    const status = newEnabled ? '有効化' : '無効化';
    ErrorHandler.showInfo(`自動プレビューを${status}しました`);
  }

  /**
   * 設定の概要を表示
   */
  @SafeCommand({
    errorMessage: '設定概要の表示に失敗しました'
  })
  async showSettingsOverview(): Promise<void> {
    const performanceSettings = ConfigManager.getPerformanceSettings();
    const autoPreviewEnabled = ConfigManager.isAutoPreviewEnabled();
    
    const overview = `
**TextUI Designer 設定概要**

**自動プレビュー**: ${autoPreviewEnabled ? '有効' : '無効'}
**パフォーマンス監視**: ${performanceSettings.enablePerformanceLogs ? '有効' : '無効'}
**メモリ追跡**: ${performanceSettings.enableMemoryTracking ? '有効' : '無効'}
**WebView更新遅延**: ${performanceSettings.webviewDebounceDelay}ms
**診断遅延**: ${performanceSettings.diagnosticDebounceDelay}ms
**キャッシュTTL**: ${performanceSettings.cacheTTL}ms
`;
    
    ErrorHandler.showInfo(overview);
  }
} 