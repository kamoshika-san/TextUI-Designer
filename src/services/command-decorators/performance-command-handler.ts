import * as vscode from 'vscode';
import { SafeCommand } from './safe-command-decorator';
import { ConfigManager } from '../../utils/config-manager';

/**
 * パフォーマンス関連のコマンドハンドラー
 */
export class PerformanceCommandHandler {

  /**
   * パフォーマンスレポートを表示
   */
  @SafeCommand({
    errorMessage: 'パフォーマンスレポートの表示に失敗しました',
    successMessage: 'パフォーマンスレポートを表示しました'
  })
  async showPerformanceReport(): Promise<void> {
    const { PerformanceMonitor } = await import('../../utils/performance-monitor');
    const monitor = PerformanceMonitor.getInstance();
    const report = monitor.generateReport();
    
    // 新しいドキュメントでレポートを表示
    const doc = await vscode.workspace.openTextDocument({
      content: report,
      language: 'markdown'
    });
    await vscode.window.showTextDocument(doc);
  }

  /**
   * パフォーマンスメトリクスをクリア
   */
  @SafeCommand({
    errorMessage: 'パフォーマンスメトリクスのクリアに失敗しました',
    successMessage: 'パフォーマンスメトリクスをクリアしました'
  })
  async clearPerformanceMetrics(): Promise<void> {
    const { PerformanceMonitor } = await import('../../utils/performance-monitor');
    const monitor = PerformanceMonitor.getInstance();
    monitor.clear();
  }

  /**
   * パフォーマンス監視の有効化/無効化を切り替え
   */
  @SafeCommand({
    errorMessage: 'パフォーマンス監視の切り替えに失敗しました'
  })
  async togglePerformanceMonitoring(): Promise<void> {
    const { PerformanceMonitor } = await import('../../utils/performance-monitor');
    const monitor = PerformanceMonitor.getInstance();
    
    // 現在の状態を確認（簡易的な方法）
    const currentSettings = ConfigManager.getPerformanceSettings();
    const newEnabled = !currentSettings.enablePerformanceLogs;
    
    // 設定を更新
    await ConfigManager.set('performance.enablePerformanceLogs', newEnabled);
    
    // モニターの状態を更新
    monitor.setEnabled(newEnabled);
    
    const status = newEnabled ? '有効化' : '無効化';
    vscode.window.showInformationMessage(`パフォーマンス監視を${status}しました`);
  }

  /**
   * パフォーマンス監視を有効化
   */
  @SafeCommand({
    errorMessage: 'パフォーマンス監視の有効化に失敗しました',
    successMessage: 'パフォーマンス監視を有効化しました'
  })
  async enablePerformanceMonitoring(): Promise<void> {
    const { PerformanceMonitor } = await import('../../utils/performance-monitor');
    const monitor = PerformanceMonitor.getInstance();
    
    await ConfigManager.set('performance.enablePerformanceLogs', true);
    monitor.setEnabled(true);
  }

  /**
   * サンプルイベントを生成
   */
  @SafeCommand({
    errorMessage: 'サンプルイベントの生成に失敗しました',
    successMessage: 'サンプルイベントを生成しました'
  })
  async generateSampleEvents(): Promise<void> {
    const { PerformanceMonitor } = await import('../../utils/performance-monitor');
    const monitor = PerformanceMonitor.getInstance();
    monitor.generateSampleEvents();
  }
} 