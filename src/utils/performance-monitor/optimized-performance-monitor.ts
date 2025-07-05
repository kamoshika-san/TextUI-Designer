import * as vscode from 'vscode';
import { ConfigManager } from '../config-manager';
import { PerformanceMetricsCollector, PerformanceMetrics, CategoryStats } from './performance-metrics-collector';

/**
 * 最適化されたパフォーマンス監視クラス
 */
export class OptimizedPerformanceMonitor {
  private static instance: OptimizedPerformanceMonitor;
  private metricsCollector: PerformanceMetricsCollector;
  private isEnabled: boolean;
  private bufferSize: number;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private statsUpdateInterval: NodeJS.Timeout | null = null;

  private constructor() {
    const settings = ConfigManager.getPerformanceSettings();
    this.isEnabled = settings.enablePerformanceLogs;
    this.bufferSize = 1000;
    this.metricsCollector = new PerformanceMetricsCollector(this.bufferSize);
    
    this.startPeriodicTasks();
    
    // デバッグ用ログ
    console.log(`[OptimizedPerformanceMonitor] 初期化完了 - 有効: ${this.isEnabled}, バッファサイズ: ${this.bufferSize}`);
  }

  static getInstance(): OptimizedPerformanceMonitor {
    if (!OptimizedPerformanceMonitor.instance) {
      OptimizedPerformanceMonitor.instance = new OptimizedPerformanceMonitor();
    }
    return OptimizedPerformanceMonitor.instance;
  }

  /**
   * パフォーマンスイベントを記録
   */
  recordEvent(type: 'render' | 'cache' | 'diff' | 'export', duration: number, metadata?: Record<string, any>): void {
    if (!this.isEnabled) return;

    switch (type) {
      case 'render':
        this.metricsCollector.recordRenderEvent(duration, metadata);
        break;
      case 'export':
        this.metricsCollector.recordExportEvent(duration, metadata);
        break;
      case 'cache':
        // キャッシュイベントはrecordCacheHitで処理
        break;
      case 'diff':
        // 差分イベントはrecordDiffEfficiencyで処理
        break;
    }

    // 開発モードではコンソールにログ出力
    if (this.isDevelopmentMode()) {
      console.log(`[Performance] ${type}: ${duration}ms`, metadata);
    }
  }

  /**
   * レンダリング時間を測定
   */
  async measureRenderTime<T>(renderFunction: () => Promise<T>): Promise<T> {
    const startTime = performance.now();
    try {
      const result = await renderFunction();
      const duration = performance.now() - startTime;
      this.metricsCollector.recordRenderEvent(duration);
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.metricsCollector.recordRenderEvent(duration, { error: true });
      throw error;
    }
  }

  /**
   * エクスポート時間を測定
   */
  async measureExportTime<T>(exportFunction: () => Promise<T>): Promise<T> {
    const startTime = performance.now();
    try {
      const result = await exportFunction();
      const duration = performance.now() - startTime;
      this.metricsCollector.recordExportEvent(duration);
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.metricsCollector.recordExportEvent(duration, { error: true });
      throw error;
    }
  }

  /**
   * キャッシュヒット率を記録
   */
  recordCacheHit(hit: boolean): void {
    if (!this.isEnabled) return;
    this.metricsCollector.recordCacheHit(hit);
  }

  /**
   * 差分更新の効率を記録
   */
  recordDiffEfficiency(changedComponents: number, totalComponents: number): void {
    if (!this.isEnabled) return;
    this.metricsCollector.recordDiffEfficiency(changedComponents, totalComponents);
  }

  /**
   * パフォーマンスメトリクスを取得（O(1)）
   */
  getMetrics(): PerformanceMetrics {
    return this.metricsCollector.getMetrics();
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
    return this.metricsCollector.getDetailedStats();
  }

  /**
   * レンダリング統計を取得（O(1)）
   */
  getRenderStats(): CategoryStats {
    return this.metricsCollector.getRenderStats();
  }

  /**
   * エクスポート統計を取得（O(1)）
   */
  getExportStats(): CategoryStats {
    return this.metricsCollector.getExportStats();
  }

  /**
   * パフォーマンスレポートを生成
   */
  generateReport(): string {
    const metrics = this.getMetrics();
    const detailedStats = this.getDetailedStats();
    const recentRenderEvents = this.metricsCollector.getLatestRenderEvents(5);
    const recentExportEvents = this.metricsCollector.getLatestExportEvents(5);

    return `
# 最適化されたパフォーマンスレポート

## 主要メトリクス（O(1)取得）
- 平均レンダリング時間: ${metrics.renderTime.toFixed(2)}ms
- キャッシュヒット率: ${metrics.cacheHitRate.toFixed(1)}%
- 差分更新効率: ${metrics.diffEfficiency.toFixed(1)}%
- メモリ使用量: ${metrics.memoryUsage.toFixed(2)}MB
- 総操作数: ${metrics.totalOperations}

## 詳細統計
### レンダリング統計
- 平均時間: ${detailedStats.render.average.toFixed(2)}ms
- 最大時間: ${detailedStats.render.max.toFixed(2)}ms
- 最小時間: ${detailedStats.render.min.toFixed(2)}ms
- 実行回数: ${detailedStats.render.count}回

### エクスポート統計
- 平均時間: ${detailedStats.export.average.toFixed(2)}ms
- 最大時間: ${detailedStats.export.max.toFixed(2)}ms
- 最小時間: ${detailedStats.export.min.toFixed(2)}ms
- 実行回数: ${detailedStats.export.count}回

### キャッシュ統計
- ヒット率: ${detailedStats.cache.hitRate.toFixed(1)}%
- ヒット数: ${detailedStats.cache.hits}
- 総アクセス数: ${detailedStats.cache.total}

## 最新のレンダリングイベント
${recentRenderEvents.map(event => 
  `- ${event.duration.toFixed(2)}ms (${new Date(event.timestamp).toLocaleTimeString()})`
).join('\n')}

## 最新のエクスポートイベント
${recentExportEvents.map(event => 
  `- ${event.duration.toFixed(2)}ms (${new Date(event.timestamp).toLocaleTimeString()})`
).join('\n')}

## 推奨事項
${this.generateRecommendations(metrics)}

## パフォーマンス改善点
- CircularBufferによるO(1)統計計算
- カテゴリ別の効率的な統計管理
- メモリ使用量の定期更新による負荷軽減
- 線形検索の完全排除
    `.trim();
  }

  /**
   * パフォーマンス改善の推奨事項を生成
   */
  private generateRecommendations(metrics: PerformanceMetrics): string {
    const recommendations: string[] = [];

    if (metrics.renderTime > 100) {
      recommendations.push('- レンダリング時間が長いため、コンポーネントの最適化を検討してください');
    }

    if (metrics.cacheHitRate < 50) {
      recommendations.push('- キャッシュヒット率が低いため、キャッシュ戦略の見直しを検討してください');
    }

    if (metrics.diffEfficiency < 80) {
      recommendations.push('- 差分更新効率が低いため、コンポーネントの変更頻度を確認してください');
    }

    if (metrics.memoryUsage > 150) {
      recommendations.push('- メモリ使用量が多いため、不要なオブジェクトの解放を検討してください');
    } else if (metrics.memoryUsage > 100) {
      recommendations.push('- メモリ使用量がやや多めです。大きなファイルを扱う場合は注意してください');
    }

    return recommendations.length > 0 ? recommendations.join('\n') : '- 現在のパフォーマンスは良好です';
  }

  /**
   * パフォーマンスデータをクリア
   */
  clear(): void {
    this.metricsCollector.clear();
  }

  /**
   * パフォーマンス監視を有効/無効化
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    console.log(`[OptimizedPerformanceMonitor] パフォーマンス監視を${enabled ? '有効' : '無効'}にしました`);
  }

  /**
   * パフォーマンス監視を強制的に有効化（デバッグ用）
   */
  forceEnable(): void {
    this.isEnabled = true;
    console.log('[OptimizedPerformanceMonitor] パフォーマンス監視を強制的に有効化しました');
  }

  /**
   * バッファーサイズを動的に調整
   */
  adjustBufferSize(newSize: number): void {
    this.bufferSize = newSize;
    this.metricsCollector.adjustBufferSize(newSize);
    console.log(`[OptimizedPerformanceMonitor] バッファーサイズを${newSize}に調整しました`);
  }

  /**
   * テスト用のサンプルイベントを生成
   */
  generateSampleEvents(): void {
    console.log('[OptimizedPerformanceMonitor] サンプルイベントを生成中...');
    
    // レンダリングイベント
    this.metricsCollector.recordRenderEvent(150, { component: 'Button' });
    this.metricsCollector.recordRenderEvent(200, { component: 'Form' });
    this.metricsCollector.recordRenderEvent(100, { component: 'Input' });
    
    // キャッシュイベント
    this.recordCacheHit(true);
    this.recordCacheHit(false);
    this.recordCacheHit(true);
    this.recordCacheHit(true);
    
    // 差分更新イベント
    this.recordDiffEfficiency(2, 10);
    this.recordDiffEfficiency(1, 5);
    this.recordDiffEfficiency(0, 3);
    
    // エクスポートイベント
    this.metricsCollector.recordExportEvent(500, { format: 'html' });
    this.metricsCollector.recordExportEvent(300, { format: 'react' });
    
    const stats = this.getDetailedStats();
    console.log('[OptimizedPerformanceMonitor] サンプルイベント生成完了');
    console.log(`- レンダリング回数: ${stats.render.count}`);
    console.log(`- エクスポート回数: ${stats.export.count}`);
    console.log(`- キャッシュアクセス: ${stats.cache.total}`);
    console.log(`- 総操作数: ${stats.operations.total}`);
  }

  /**
   * 開発モードかどうかを判定
   */
  private isDevelopmentMode(): boolean {
    try {
      return process.env.NODE_ENV === 'development' || 
             (typeof vscode !== 'undefined' && vscode.env?.uiKind === vscode.UIKind.Web);
    } catch (error) {
      return process.env.NODE_ENV === 'development' || false;
    }
  }

  /**
   * 定期的なタスクを開始
   */
  private startPeriodicTasks(): void {
    // 定期的なクリーンアップ（不要になったため軽量化）
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // 軽量な統計更新（必要に応じて）
    this.statsUpdateInterval = setInterval(() => {
      // CircularBufferは自動的に古いデータを削除するため、特別な処理は不要
      // 必要に応じてここで追加の統計処理を行う
    }, 5 * 60 * 1000); // 5分ごと
  }

  /**
   * リソースを解放
   */
  dispose(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    if (this.statsUpdateInterval) {
      clearInterval(this.statsUpdateInterval);
      this.statsUpdateInterval = null;
    }
  }

  /**
   * テスト用: メトリクスを直接設定する
   */
  _setTestMetrics(metrics: PerformanceMetrics): void {
    // テスト用のメトリクス設定は新しいアーキテクチャでは不要
    // 実際のデータ投入でテストを行う
    console.warn('[OptimizedPerformanceMonitor] _setTestMetrics は非推奨です。実際のデータ投入でテストしてください。');
  }

  /**
   * テスト用: 推奨事項を取得する
   */
  _getRecommendations(metrics?: PerformanceMetrics): string {
    return this.generateRecommendations(metrics || this.getMetrics());
  }
} 