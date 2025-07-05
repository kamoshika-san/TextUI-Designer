import * as vscode from 'vscode';
import { ConfigManager } from '../config-manager';
import { MemoryCategory, MemoryCategoryType, MemoryTrackedObject } from './memory-category';

export interface OptimizedMemoryMetrics {
  webviewMemory: number; // WebView関連メモリ使用量 (MB)
  yamlCacheMemory: number; // YAML解析キャッシュメモリ使用量 (MB)
  diagnosticsMemory: number; // 診断システムメモリ使用量 (MB)
  renderCacheMemory: number; // レンダリングキャッシュメモリ使用量 (MB)
  totalTrackedMemory: number; // 追跡対象メモリ総量 (MB)
  lastMeasured: number; // 最後の測定時刻
  measurementOverhead: number; // 測定オーバーヘッド (ms)
}

export interface MemoryReport {
  metrics: OptimizedMemoryMetrics;
  recommendations: string[];
  details: {
    [key in MemoryCategoryType]: {
      objectCount: number;
      totalSizeMB: number;
      averageSizeKB: number;
    };
  };
}

/**
 * 最適化されたメモリ追跡システム
 * WeakMapの複雑性を排除し、シンプルで効率的な追跡を実現
 */
export class OptimizedMemoryTracker {
  private static instance: OptimizedMemoryTracker;
  
  // カテゴリ別のメモリ管理
  private categories = new Map<MemoryCategoryType, MemoryCategory>();
  
  // 設定
  private isEnabled: boolean = false;
  private maxSize: number = 1000;
  private measurementInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  
  // パフォーマンス監視
  private measurementStartTime = 0;
  private lastMeasurementOverhead = 0;
  
  // 制限設定
  private readonly MAX_OBJECTS_PER_CATEGORY = 1000;
  private readonly MAX_MEMORY_PER_CATEGORY_MB = 100;
  private readonly CLEANUP_AGE_MS = 5 * 60 * 1000; // 5分

  constructor(enabled: boolean = true, maxSize: number = 1000) {
    this.isEnabled = enabled;
    this.maxSize = maxSize;
    this.categories = new Map();
    this.initializeCategories();
  }

  static getInstance(): OptimizedMemoryTracker {
    if (!OptimizedMemoryTracker.instance) {
      OptimizedMemoryTracker.instance = new OptimizedMemoryTracker();
    }
    return OptimizedMemoryTracker.instance;
  }

  /**
   * カテゴリを初期化
   */
  private initializeCategories(): void {
    const categoryTypes: MemoryCategoryType[] = ['webview', 'yaml-cache', 'diagnostics', 'render-cache'];
    
    categoryTypes.forEach(type => {
      this.categories.set(type, new MemoryCategory(type));
    });
  }

  /**
   * 設定を読み込み
   */
  private loadSettings(): void {
    const settings = ConfigManager.getPerformanceSettings();
    this.isEnabled = settings.enableMemoryTracking || false;
  }

  /**
   * オブジェクトを追跡に追加（O(1)）
   */
  trackObject(type: MemoryCategoryType, id: string, size: number, metadata?: Record<string, any>): void {
    if (!this.isEnabled) { return; }

    const category = this.categories.get(type);
    if (!category) {
      console.warn(`[OptimizedMemoryTracker] 未知のカテゴリ: ${type}`);
      return;
    }

    // 制限チェック
    if (category.isAtCapacity(this.MAX_OBJECTS_PER_CATEGORY)) {
      console.warn(`[OptimizedMemoryTracker] ${type}カテゴリがオブジェクト数上限に達しました`);
      return;
    }

    if (category.isAtMemoryLimit(this.MAX_MEMORY_PER_CATEGORY_MB)) {
      console.warn(`[OptimizedMemoryTracker] ${type}カテゴリがメモリ上限に達しました`);
      return;
    }

    category.trackObject(id, size, metadata);

    if (this.isDevelopmentMode()) {
      console.log(`[OptimizedMemoryTracker] ${type}オブジェクトを追跡: ${id} (${size}バイト)`);
    }
  }

  /**
   * オブジェクトを追跡から削除（O(1)）
   */
  untrackObject(type: MemoryCategoryType, id: string): boolean {
    if (!this.isEnabled) { return false; }

    const category = this.categories.get(type);
    if (!category) { return false; }

    return category.untrackObject(id);
  }

  /**
   * メモリ使用量を測定（O(1)統計取得）
   */
  private async measureMemoryUsage(): Promise<void> {
    if (!this.isEnabled) { return; }

    this.measurementStartTime = performance.now();

    try {
      const metrics: OptimizedMemoryMetrics = {
        webviewMemory: 0,
        yamlCacheMemory: 0,
        diagnosticsMemory: 0,
        renderCacheMemory: 0,
        totalTrackedMemory: 0,
        lastMeasured: Date.now(),
        measurementOverhead: 0
      };

      // 各カテゴリのメモリ使用量を取得（O(1)）
      for (const [type, category] of this.categories.entries()) {
        const memoryMB = category.getMemoryUsageMB();
        
        switch (type) {
          case 'webview':
            metrics.webviewMemory = memoryMB;
            break;
          case 'yaml-cache':
            metrics.yamlCacheMemory = memoryMB;
            break;
          case 'diagnostics':
            metrics.diagnosticsMemory = memoryMB;
            break;
          case 'render-cache':
            metrics.renderCacheMemory = memoryMB;
            break;
        }
      }

      metrics.totalTrackedMemory = metrics.webviewMemory + metrics.yamlCacheMemory + 
                                  metrics.diagnosticsMemory + metrics.renderCacheMemory;

      // 測定オーバーヘッドを計算
      this.lastMeasurementOverhead = performance.now() - this.measurementStartTime;
      metrics.measurementOverhead = this.lastMeasurementOverhead;

      if (this.isDevelopmentMode()) {
        console.log('[OptimizedMemoryTracker] メモリ測定完了:', {
          total: metrics.totalTrackedMemory.toFixed(2) + 'MB',
          overhead: this.lastMeasurementOverhead.toFixed(2) + 'ms'
        });
      }
    } catch (error) {
      console.error('[OptimizedMemoryTracker] メモリ測定エラー:', error);
    }
  }

  /**
   * 現在のメモリメトリクスを取得（O(1)）
   */
  getMetrics(): OptimizedMemoryMetrics {
    const metrics: OptimizedMemoryMetrics = {
      webviewMemory: this.categories.get('webview')?.getMemoryUsageMB() || 0,
      yamlCacheMemory: this.categories.get('yaml-cache')?.getMemoryUsageMB() || 0,
      diagnosticsMemory: this.categories.get('diagnostics')?.getMemoryUsageMB() || 0,
      renderCacheMemory: this.categories.get('render-cache')?.getMemoryUsageMB() || 0,
      totalTrackedMemory: 0,
      lastMeasured: Date.now(),
      measurementOverhead: this.lastMeasurementOverhead
    };

    metrics.totalTrackedMemory = metrics.webviewMemory + metrics.yamlCacheMemory + 
                                metrics.diagnosticsMemory + metrics.renderCacheMemory;

    return metrics;
  }

  /**
   * 詳細なメモリレポートを生成
   */
  generateMemoryReport(): MemoryReport {
    const metrics = this.getMetrics();
    const details: MemoryReport['details'] = {
      'webview': { objectCount: 0, totalSizeMB: 0, averageSizeKB: 0 },
      'yaml-cache': { objectCount: 0, totalSizeMB: 0, averageSizeKB: 0 },
      'diagnostics': { objectCount: 0, totalSizeMB: 0, averageSizeKB: 0 },
      'render-cache': { objectCount: 0, totalSizeMB: 0, averageSizeKB: 0 }
    };

    // 各カテゴリの詳細情報を取得
    for (const [type, category] of this.categories.entries()) {
      const stats = category.getStats();
      details[type] = {
        objectCount: stats.objectCount,
        totalSizeMB: stats.totalSize / (1024 * 1024),
        averageSizeKB: stats.averageSize / 1024
      };
    }

    const recommendations = this.generateRecommendations(metrics, details);

    return {
      metrics,
      recommendations,
      details
    };
  }

  /**
   * メモリ使用量に基づく推奨事項を生成
   */
  private generateRecommendations(metrics: OptimizedMemoryMetrics, details: MemoryReport['details']): string[] {
    const recommendations: string[] = [];

    // 総メモリ使用量のチェック
    if (metrics.totalTrackedMemory > 500) {
      recommendations.push('総メモリ使用量が500MBを超えています。不要なキャッシュをクリアすることを推奨します。');
    }

    // カテゴリ別のチェック
    Object.entries(details).forEach(([category, detail]) => {
      if (detail.totalSizeMB > 100) {
        recommendations.push(`${category}カテゴリのメモリ使用量が100MBを超えています。`);
      }
      
      if (detail.objectCount > 500) {
        recommendations.push(`${category}カテゴリのオブジェクト数が500を超えています。古いオブジェクトのクリーンアップを推奨します。`);
      }
    });

    // 測定オーバーヘッドのチェック
    if (metrics.measurementOverhead > 10) {
      recommendations.push('メモリ測定のオーバーヘッドが10msを超えています。測定間隔の調整を検討してください。');
    }

    return recommendations;
  }

  /**
   * 古いオブジェクトをクリーンアップ
   */
  private cleanupOldObjects(): void {
    if (!this.isEnabled) { return; }

    let totalCleaned = 0;
    
    for (const [type, category] of this.categories.entries()) {
      const cleaned = category.cleanupOldObjects(this.CLEANUP_AGE_MS);
      totalCleaned += cleaned;
      
      if (cleaned > 0 && this.isDevelopmentMode()) {
        console.log(`[OptimizedMemoryTracker] ${type}カテゴリから${cleaned}個の古いオブジェクトをクリーンアップ`);
      }
    }

    if (totalCleaned > 0) {
      console.log(`[OptimizedMemoryTracker] 合計${totalCleaned}個の古いオブジェクトをクリーンアップしました`);
    }
  }

  /**
   * 測定間隔を開始
   */
  private startMeasurementInterval(): void {
    this.measurementInterval = setInterval(() => {
      this.measureMemoryUsage();
    }, 5000); // 5秒間隔
  }

  /**
   * クリーンアップ間隔を開始
   */
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldObjects();
    }, 30000); // 30秒間隔
  }

  /**
   * 開発モードかどうかを判定
   */
  private isDevelopmentMode(): boolean {
    return process.env.NODE_ENV === 'development' || 
           process.env.VSCODE_DEBUG_MODE === 'true' ||
           process.env.TEXTUI_DEBUG === 'true';
  }

  /**
   * 設定を更新
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    
    if (enabled) {
      this.startMeasurementInterval();
      this.startCleanupInterval();
      console.log('[OptimizedMemoryTracker] メモリ追跡が有効化されました');
    } else {
      this.stopMeasurementInterval();
      this.stopCleanupInterval();
      console.log('[OptimizedMemoryTracker] メモリ追跡が無効化されました');
    }
  }

  /**
   * 測定間隔を停止
   */
  private stopMeasurementInterval(): void {
    if (this.measurementInterval) {
      clearInterval(this.measurementInterval);
      this.measurementInterval = null;
    }
  }

  /**
   * クリーンアップ間隔を停止
   */
  private stopCleanupInterval(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * リソースを解放
   */
  dispose(): void {
    this.stopMeasurementInterval();
    this.stopCleanupInterval();
    
    // 全カテゴリをクリア
    for (const category of this.categories.values()) {
      category.clear();
    }
    
    console.log('[OptimizedMemoryTracker] リソースを解放しました');
  }

  /**
   * テスト用メソッド
   */
  _setTestMetrics(metrics: Partial<OptimizedMemoryMetrics>): void {
    // テスト用の実装
  }

  /**
   * テスト用メモリ測定
   */
  async _measureMemoryForTest(): Promise<void> {
    await this.measureMemoryUsage();
  }
} 