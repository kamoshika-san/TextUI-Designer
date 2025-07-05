import * as vscode from 'vscode';
import { ConfigManager } from './config-manager';
import { 
  OptimizedPerformanceMonitor, 
  PerformanceMetrics, 
  PerformanceEvent,
  CategoryStats 
} from './performance-monitor/index';

/**
 * パフォーマンス監視と最適化を管理するクラス（最適化済み）
 * 
 * @deprecated 直接OptimizedPerformanceMonitorを使用することを推奨
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private optimizedMonitor: OptimizedPerformanceMonitor;

  private constructor() {
    this.optimizedMonitor = OptimizedPerformanceMonitor.getInstance();
    
    // 互換性のためのメッセージ
    console.log('[PerformanceMonitor] 最適化されたパフォーマンスモニターを使用しています');
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * パフォーマンスイベントを記録
   */
  recordEvent(type: PerformanceEvent['type'], duration: number, metadata?: Record<string, any>): void {
    this.optimizedMonitor.recordEvent(type, duration, metadata);
  }

  /**
   * レンダリング時間を測定
   */
  async measureRenderTime<T>(renderFunction: () => Promise<T>): Promise<T> {
    return this.optimizedMonitor.measureRenderTime(renderFunction);
  }

  /**
   * キャッシュヒット率を記録
   */
  recordCacheHit(hit: boolean): void {
    this.optimizedMonitor.recordCacheHit(hit);
  }

  /**
   * 差分更新の効率を記録
   */
  recordDiffEfficiency(changedComponents: number, totalComponents: number): void {
    this.optimizedMonitor.recordDiffEfficiency(changedComponents, totalComponents);
  }

  /**
   * エクスポート時間を測定
   */
  async measureExportTime<T>(exportFunction: () => Promise<T>): Promise<T> {
    return this.optimizedMonitor.measureExportTime(exportFunction);
  }

  /**
   * パフォーマンスメトリクスを取得
   */
  getMetrics(): PerformanceMetrics {
    return this.optimizedMonitor.getMetrics();
  }

  /**
   * パフォーマンスレポートを生成
   */
  generateReport(): string {
    return this.optimizedMonitor.generateReport();
  }

  /**
   * パフォーマンスデータをクリア
   */
  clear(): void {
    this.optimizedMonitor.clear();
  }

  /**
   * パフォーマンス監視を有効/無効化
   */
  setEnabled(enabled: boolean): void {
    this.optimizedMonitor.setEnabled(enabled);
  }

  /**
   * パフォーマンス監視を強制的に有効化（デバッグ用）
   */
  forceEnable(): void {
    this.optimizedMonitor.forceEnable();
  }

  /**
   * テスト用のサンプルイベントを生成
   */
  generateSampleEvents(): void {
    this.optimizedMonitor.generateSampleEvents();
  }

  /**
   * リソースを解放
   */
  dispose(): void {
    this.optimizedMonitor.dispose();
  }

  /**
   * テスト用: メトリクスを直接設定する
   */
  _setTestMetrics(metrics: PerformanceMetrics): void {
    this.optimizedMonitor._setTestMetrics(metrics);
  }

  /**
   * テスト用: 推奨事項を取得する
   */
  _getRecommendations(metrics?: PerformanceMetrics): string {
    return this.optimizedMonitor._getRecommendations(metrics);
  }

  /**
   * 詳細な統計情報を取得
   */
  getDetailedStats(): {
    render: CategoryStats;
    export: CategoryStats;
    cache: { hitRate: number; hits: number; total: number };
    diff: { efficiency: number };
    memory: { usage: number };
    operations: { total: number };
  } {
    return this.optimizedMonitor.getDetailedStats();
  }

  /**
   * レンダリング統計を取得
   */
  getRenderStats(): CategoryStats {
    return this.optimizedMonitor.getRenderStats();
  }

  /**
   * エクスポート統計を取得
   */
  getExportStats(): CategoryStats {
    return this.optimizedMonitor.getExportStats();
  }

  /**
   * バッファーサイズを動的に調整
   */
  adjustBufferSize(newSize: number): void {
    this.optimizedMonitor.adjustBufferSize(newSize);
  }
}

// 型定義の再エクスポート
export type { PerformanceMetrics, PerformanceEvent, CategoryStats };

// 最適化されたモニターの直接アクセス
export { OptimizedPerformanceMonitor }; 