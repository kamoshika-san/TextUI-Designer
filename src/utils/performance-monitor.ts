import * as vscode from 'vscode';
import { ConfigManager } from './config-manager';

export interface PerformanceMetrics {
  renderTime: number;
  cacheHitRate: number;
  diffEfficiency: number;
  memoryUsage: number;
  totalOperations: number;
}

export interface PerformanceEvent {
  type: 'render' | 'cache' | 'diff' | 'export';
  duration: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

/**
 * パフォーマンス監視と最適化を管理するクラス
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private events: PerformanceEvent[] = [];
  private metrics: PerformanceMetrics = {
    renderTime: 0,
    cacheHitRate: 0,
    diffEfficiency: 0,
    memoryUsage: 0,
    totalOperations: 0
  };
  private isEnabled: boolean;
  private maxEvents: number;
  private cleanupInterval: NodeJS.Timeout | null = null;

  private constructor() {
    const settings = ConfigManager.getPerformanceSettings();
    this.isEnabled = settings.enablePerformanceLogs;
    this.maxEvents = 1000;
    this.startCleanupInterval();
    
    // デバッグ用ログ
    console.log(`[PerformanceMonitor] 初期化完了 - 有効: ${this.isEnabled}`);
    if (this.isEnabled) {
      console.log('[PerformanceMonitor] パフォーマンス監視が有効です');
    } else {
      console.log('[PerformanceMonitor] パフォーマンス監視が無効です。設定で有効化してください。');
    }
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
    if (!this.isEnabled) {return;}

    const event: PerformanceEvent = {
      type,
      duration,
      timestamp: Date.now(),
      metadata
    };

    this.events.push(event);
    this.updateMetrics(event);

    // イベント数が上限に達したら古いものを削除
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
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
      this.recordEvent('render', duration);
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.recordEvent('render', duration, { error: true });
      throw error;
    }
  }

  /**
   * キャッシュヒット率を記録
   */
  recordCacheHit(hit: boolean): void {
    this.recordEvent('cache', 0, { hit });
  }

  /**
   * 差分更新の効率を記録
   */
  recordDiffEfficiency(changedComponents: number, totalComponents: number): void {
    const efficiency = totalComponents > 0 ? ((totalComponents - changedComponents) / totalComponents) * 100 : 100;
    this.recordEvent('diff', 0, { 
      changedComponents, 
      totalComponents, 
      efficiency 
    });
  }

  /**
   * エクスポート時間を測定
   */
  async measureExportTime<T>(exportFunction: () => Promise<T>): Promise<T> {
    const startTime = performance.now();
    try {
      const result = await exportFunction();
      const duration = performance.now() - startTime;
      this.recordEvent('export', duration);
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.recordEvent('export', duration, { error: true });
      throw error;
    }
  }

  /**
   * メトリクスを更新
   */
  private updateMetrics(event: PerformanceEvent): void {
    this.metrics.totalOperations++;

    switch (event.type) {
      case 'render':
        this.metrics.renderTime = this.calculateAverageRenderTime();
        break;
      case 'cache':
        this.metrics.cacheHitRate = this.calculateCacheHitRate();
        break;
      case 'diff':
        if (event.metadata?.efficiency) {
          this.metrics.diffEfficiency = event.metadata.efficiency;
        }
        break;
    }

    // メモリ使用量を更新
    this.metrics.memoryUsage = this.getMemoryUsage();
  }

  /**
   * 平均レンダリング時間を計算
   */
  private calculateAverageRenderTime(): number {
    const renderEvents = this.events.filter(e => e.type === 'render');
    if (renderEvents.length === 0) {return 0;}

    const totalTime = renderEvents.reduce((sum, event) => sum + event.duration, 0);
    return totalTime / renderEvents.length;
  }

  /**
   * キャッシュヒット率を計算
   */
  private calculateCacheHitRate(): number {
    const cacheEvents = this.events.filter(e => e.type === 'cache');
    if (cacheEvents.length === 0) {return 0;}

    const hits = cacheEvents.filter(e => e.metadata?.hit).length;
    return (hits / cacheEvents.length) * 100;
  }

  /**
   * メモリ使用量を取得
   */
  private getMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage();
      return usage.heapUsed / 1024 / 1024; // MB単位
    }
    return 0;
  }

  /**
   * パフォーマンスメトリクスを取得
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * パフォーマンスレポートを生成
   */
  generateReport(): string {
    const metrics = this.getMetrics();
    const recentEvents = this.events.slice(-10);

    return `
# パフォーマンスレポート

## メトリクス
- 平均レンダリング時間: ${metrics.renderTime.toFixed(2)}ms
- キャッシュヒット率: ${metrics.cacheHitRate.toFixed(1)}%
- 差分更新効率: ${metrics.diffEfficiency.toFixed(1)}%
- メモリ使用量: ${metrics.memoryUsage.toFixed(2)}MB
- 総操作数: ${metrics.totalOperations}

## 最近のイベント
${recentEvents.map(event => 
  `- ${event.type}: ${event.duration}ms (${new Date(event.timestamp).toLocaleTimeString()})`
).join('\n')}

## 推奨事項
${this.generateRecommendations(metrics)}
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
    this.events = [];
    this.metrics = {
      renderTime: 0,
      cacheHitRate: 0,
      diffEfficiency: 0,
      memoryUsage: 0,
      totalOperations: 0
    };
  }

  /**
   * パフォーマンス監視を有効/無効化
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    console.log(`[PerformanceMonitor] パフォーマンス監視を${enabled ? '有効' : '無効'}にしました`);
  }

  /**
   * パフォーマンス監視を強制的に有効化（デバッグ用）
   */
  forceEnable(): void {
    this.isEnabled = true;
    console.log('[PerformanceMonitor] パフォーマンス監視を強制的に有効化しました');
  }

  /**
   * テスト用のサンプルイベントを生成
   */
  generateSampleEvents(): void {
    console.log('[PerformanceMonitor] サンプルイベントを生成中...');
    
    // レンダリングイベント
    this.recordEvent('render', 150, { component: 'Button' });
    this.recordEvent('render', 200, { component: 'Form' });
    this.recordEvent('render', 100, { component: 'Input' });
    
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
    this.recordEvent('export', 500, { format: 'html' });
    this.recordEvent('export', 300, { format: 'react' });
    
    console.log(`[PerformanceMonitor] サンプルイベント生成完了 - 総イベント数: ${this.events.length}`);
  }

  /**
   * 開発モードかどうかを判定
   */
  private isDevelopmentMode(): boolean {
    try {
      return process.env.NODE_ENV === 'development' || 
             (typeof vscode !== 'undefined' && vscode.env?.uiKind === vscode.UIKind.Web);
    } catch (error) {
      // テスト環境など、vscodeオブジェクトが利用できない場合
      return process.env.NODE_ENV === 'development' || false;
    }
  }

  /**
   * 定期的なクリーンアップを開始
   */
  private startCleanupInterval(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(() => {
      // 1時間以上古いイベントを削除
      const oneHourAgo = Date.now() - (60 * 60 * 1000);
      this.events = this.events.filter(event => event.timestamp > oneHourAgo);
    }, 60 * 60 * 1000); // 1時間ごと
  }

  /**
   * リソースを解放
   */
  dispose(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * テスト用: メトリクスを直接設定する
   */
  _setTestMetrics(metrics: PerformanceMetrics): void {
    this.metrics = { ...metrics };
  }

  /**
   * テスト用: 推奨事項を取得する
   */
  _getRecommendations(metrics?: PerformanceMetrics): string {
    return this.generateRecommendations(metrics || this.metrics);
  }
} 