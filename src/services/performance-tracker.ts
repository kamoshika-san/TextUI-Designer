import { PerformanceMonitor } from '../utils/performance-monitor';

/**
 * パフォーマンス追跡
 * 拡張機能のアクティベーション時間やパフォーマンス指標の追跡を担当
 */
export class PerformanceTracker {
  private performanceMonitor: PerformanceMonitor;
  private activationStartTime: number = 0;
  private isTracking = false;

  constructor() {
    this.performanceMonitor = PerformanceMonitor.getInstance();
  }

  /**
   * アクティベーション追跡の開始
   */
  startActivation(): void {
    if (this.isTracking) {
      console.log('[PerformanceTracker] パフォーマンス追跡は既に開始されています');
      return;
    }

    console.log('[PerformanceTracker] アクティベーション追跡を開始します');
    this.isTracking = true;
    this.activationStartTime = Date.now();
  }

  /**
   * アクティベーション追跡の完了
   */
  completeActivation(): void {
    if (!this.isTracking) {
      console.log('[PerformanceTracker] パフォーマンス追跡が開始されていません');
      return;
    }

    const endTime = Date.now();
    const activationTime = endTime - this.activationStartTime;
    
    console.log(`[PerformanceTracker] 拡張機能のアクティベーション完了: ${activationTime}ms`);
    this.performanceMonitor.recordEvent('export', activationTime, { type: 'activation' });
    
    this.isTracking = false;
  }

  /**
   * イベントの記録
   */
  recordEvent(eventName: 'render' | 'cache' | 'diff' | 'export', duration: number, metadata?: any): void {
    this.performanceMonitor.recordEvent(eventName, duration, metadata);
  }

  /**
   * パフォーマンス統計の取得
   */
  getPerformanceStats(): any {
    return this.performanceMonitor.getMetrics();
  }

  /**
   * パフォーマンス追跡のリセット
   */
  reset(): void {
    this.performanceMonitor.clear();
    this.isTracking = false;
    this.activationStartTime = 0;
  }

  /**
   * リソースのクリーンアップ
   */
  dispose(): void {
    console.log('[PerformanceTracker] パフォーマンス追跡のクリーンアップ');
    this.performanceMonitor.dispose();
    this.isTracking = false;
    this.activationStartTime = 0;
  }
} 