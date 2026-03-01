import * as vscode from 'vscode';
import { ErrorHandler } from '../utils/error-handler';
import { ConfigManager } from '../utils/config-manager';
import { TextUIMemoryTracker } from '../utils/textui-memory-tracker';

/**
 * パフォーマンス/メモリ監視関連コマンドの処理を担当
 */
export class RuntimeInspectionService {
  /**
   * パフォーマンスレポートを表示
   */
  async showPerformanceReport(): Promise<void> {
    const result = await ErrorHandler.executeSafely(async () => {
      const { PerformanceMonitor } = await import('../utils/performance-monitor');
      const monitor = PerformanceMonitor.getInstance();
      const report = monitor.generateReport();

      const doc = await vscode.workspace.openTextDocument({
        content: report,
        language: 'markdown'
      });
      await vscode.window.showTextDocument(doc);

      ErrorHandler.showInfo('パフォーマンスレポートを表示しました');
    }, 'パフォーマンスレポートの表示に失敗しました');

    if (!result) {
      return;
    }
  }

  /**
   * パフォーマンスメトリクスをクリア
   */
  async clearPerformanceMetrics(): Promise<void> {
    const result = await ErrorHandler.executeSafely(async () => {
      const { PerformanceMonitor } = await import('../utils/performance-monitor');
      const monitor = PerformanceMonitor.getInstance();
      monitor.clear();
      ErrorHandler.showInfo('パフォーマンスメトリクスをクリアしました');
    }, 'パフォーマンスメトリクスのクリアに失敗しました');

    if (!result) {
      return;
    }
  }

  /**
   * パフォーマンス監視の有効化/無効化を切り替え
   */
  async togglePerformanceMonitoring(): Promise<void> {
    const result = await ErrorHandler.executeSafely(async () => {
      const { PerformanceMonitor } = await import('../utils/performance-monitor');
      const monitor = PerformanceMonitor.getInstance();
      const currentSettings = ConfigManager.getPerformanceSettings();
      const newEnabled = !currentSettings.enablePerformanceLogs;

      await ConfigManager.set('performance.enablePerformanceLogs', newEnabled);
      monitor.setEnabled(newEnabled);

      const status = newEnabled ? '有効化' : '無効化';
      ErrorHandler.showInfo(`パフォーマンス監視を${status}しました`);
    }, 'パフォーマンス監視の切り替えに失敗しました');

    if (!result) {
      return;
    }
  }

  /**
   * パフォーマンス監視を有効化
   */
  async enablePerformanceMonitoring(): Promise<void> {
    const result = await ErrorHandler.executeSafely(async () => {
      const { PerformanceMonitor } = await import('../utils/performance-monitor');
      const monitor = PerformanceMonitor.getInstance();
      await ConfigManager.set('performance.enablePerformanceLogs', true);
      monitor.setEnabled(true);
      ErrorHandler.showInfo('パフォーマンス監視を有効化しました');
    }, 'パフォーマンス監視の有効化に失敗しました');

    if (!result) {
      return;
    }
  }

  /**
   * サンプルイベントを生成
   */
  async generateSampleEvents(): Promise<void> {
    const result = await ErrorHandler.executeSafely(async () => {
      const { PerformanceMonitor } = await import('../utils/performance-monitor');
      const monitor = PerformanceMonitor.getInstance();
      monitor.generateSampleEvents();
      ErrorHandler.showInfo('サンプルイベントを生成しました');
    }, 'サンプルイベントの生成に失敗しました');

    if (!result) {
      return;
    }
  }

  /**
   * メモリレポートを表示
   */
  async showMemoryReport(): Promise<void> {
    const result = await ErrorHandler.executeSafely(async () => {
      const memoryTracker = TextUIMemoryTracker.getInstance();
      const report = memoryTracker.generateMemoryReport();

      const doc = await vscode.workspace.openTextDocument({
        content: report,
        language: 'markdown'
      });
      await vscode.window.showTextDocument(doc);

      ErrorHandler.showInfo('メモリレポートを表示しました');
    }, 'メモリレポートの表示に失敗しました');

    if (!result) {
      return;
    }
  }

  /**
   * メモリ追跡の有効化/無効化を切り替え
   */
  async toggleMemoryTracking(): Promise<void> {
    const result = await ErrorHandler.executeSafely(async () => {
      const memoryTracker = TextUIMemoryTracker.getInstance();
      const currentSettings = ConfigManager.getPerformanceSettings();
      const newEnabled = !currentSettings.enableMemoryTracking;

      await ConfigManager.set('performance.enableMemoryTracking', newEnabled);
      memoryTracker.setEnabled(newEnabled);

      const status = newEnabled ? '有効化' : '無効化';
      ErrorHandler.showInfo(`メモリ追跡を${status}しました`);
    }, 'メモリ追跡の切り替えに失敗しました');

    if (!result) {
      return;
    }
  }

  /**
   * メモリ追跡を有効化
   */
  async enableMemoryTracking(): Promise<void> {
    const result = await ErrorHandler.executeSafely(async () => {
      const memoryTracker = TextUIMemoryTracker.getInstance();

      await ConfigManager.set('performance.enableMemoryTracking', true);
      memoryTracker.setEnabled(true);

      ErrorHandler.showInfo('メモリ追跡を有効化しました');
    }, 'メモリ追跡の有効化に失敗しました');

    if (!result) {
      return;
    }
  }
}
