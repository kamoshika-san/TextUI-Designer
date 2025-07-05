import { CircularBuffer } from './circular-buffer';

export interface PerformanceEvent {
  type: 'render' | 'cache' | 'diff' | 'export';
  duration: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface PerformanceMetrics {
  renderTime: number;
  cacheHitRate: number;
  diffEfficiency: number;
  memoryUsage: number;
  totalOperations: number;
}

export interface CategoryStats {
  average: number;
  count: number;
  sum: number;
  max: number;
  min: number;
  latest: number;
}

/**
 * 効率的なパフォーマンスメトリクス収集クラス
 */
export class PerformanceMetricsCollector {
  private renderTimes: CircularBuffer<PerformanceEvent>;
  private exportTimes: CircularBuffer<PerformanceEvent>;
  private cacheHits: number = 0;
  private cacheTotal: number = 0;
  private diffEfficiency: number = 0;
  private memoryUsage: number = 0;
  private totalOperations: number = 0;
  private memoryUpdateInterval: number = 30000; // 30秒
  private lastMemoryUpdate: number = 0;

  constructor(bufferSize: number = 1000) {
    this.renderTimes = new CircularBuffer<PerformanceEvent>(
      bufferSize,
      (event) => event.duration
    );
    this.exportTimes = new CircularBuffer<PerformanceEvent>(
      bufferSize,
      (event) => event.duration
    );
  }

  /**
   * レンダリングイベントを記録（O(1)）
   */
  recordRenderEvent(duration: number, metadata?: Record<string, any>): void {
    const event: PerformanceEvent = {
      type: 'render',
      duration,
      timestamp: Date.now(),
      metadata
    };
    
    this.renderTimes.push(event);
    this.totalOperations++;
  }

  /**
   * キャッシュヒットを記録（O(1)）
   */
  recordCacheHit(hit: boolean): void {
    this.cacheTotal++;
    if (hit) {
      this.cacheHits++;
    }
    this.totalOperations++;
  }

  /**
   * 差分効率を記録（O(1)）
   */
  recordDiffEfficiency(changedComponents: number, totalComponents: number): void {
    this.diffEfficiency = totalComponents > 0 
      ? ((totalComponents - changedComponents) / totalComponents) * 100 
      : 100;
    this.totalOperations++;
  }

  /**
   * エクスポートイベントを記録（O(1)）
   */
  recordExportEvent(duration: number, metadata?: Record<string, any>): void {
    const event: PerformanceEvent = {
      type: 'export',
      duration,
      timestamp: Date.now(),
      metadata
    };
    
    this.exportTimes.push(event);
    this.totalOperations++;
  }

  /**
   * メモリ使用量を更新（必要な時だけ）
   */
  private updateMemoryUsage(): void {
    const now = Date.now();
    if (now - this.lastMemoryUpdate > this.memoryUpdateInterval) {
      this.memoryUsage = this.calculateMemoryUsage();
      this.lastMemoryUpdate = now;
    }
  }

  /**
   * メモリ使用量を計算
   */
  private calculateMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage();
      return usage.heapUsed / 1024 / 1024; // MB単位
    }
    return 0;
  }

  /**
   * レンダリング統計を取得（O(1)）
   */
  getRenderStats(): CategoryStats {
    return {
      average: this.renderTimes.getAverage(),
      count: this.renderTimes.getCount(),
      sum: this.renderTimes.getSum(),
      max: this.renderTimes.getMax(),
      min: this.renderTimes.getMin(),
      latest: this.renderTimes.getLatest()?.duration || 0
    };
  }

  /**
   * エクスポート統計を取得（O(1)）
   */
  getExportStats(): CategoryStats {
    return {
      average: this.exportTimes.getAverage(),
      count: this.exportTimes.getCount(),
      sum: this.exportTimes.getSum(),
      max: this.exportTimes.getMax(),
      min: this.exportTimes.getMin(),
      latest: this.exportTimes.getLatest()?.duration || 0
    };
  }

  /**
   * キャッシュヒット率を取得（O(1)）
   */
  getCacheHitRate(): number {
    return this.cacheTotal > 0 ? (this.cacheHits / this.cacheTotal) * 100 : 0;
  }

  /**
   * 差分効率を取得（O(1)）
   */
  getDiffEfficiency(): number {
    return this.diffEfficiency;
  }

  /**
   * 統合メトリクスを取得（O(1)）
   */
  getMetrics(): PerformanceMetrics {
    this.updateMemoryUsage();
    
    return {
      renderTime: this.renderTimes.getAverage(),
      cacheHitRate: this.getCacheHitRate(),
      diffEfficiency: this.diffEfficiency,
      memoryUsage: this.memoryUsage,
      totalOperations: this.totalOperations
    };
  }

  /**
   * 最新のレンダリングイベントを取得
   */
  getLatestRenderEvents(count: number = 10): PerformanceEvent[] {
    return this.renderTimes.getLatestN(count);
  }

  /**
   * 最新のエクスポートイベントを取得
   */
  getLatestExportEvents(count: number = 10): PerformanceEvent[] {
    return this.exportTimes.getLatestN(count);
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
    this.updateMemoryUsage();
    
    return {
      render: this.getRenderStats(),
      export: this.getExportStats(),
      cache: {
        hitRate: this.getCacheHitRate(),
        hits: this.cacheHits,
        total: this.cacheTotal
      },
      diff: {
        efficiency: this.diffEfficiency
      },
      memory: {
        usage: this.memoryUsage
      },
      operations: {
        total: this.totalOperations
      }
    };
  }

  /**
   * 統計をクリア
   */
  clear(): void {
    this.renderTimes.clear();
    this.exportTimes.clear();
    this.cacheHits = 0;
    this.cacheTotal = 0;
    this.diffEfficiency = 0;
    this.memoryUsage = 0;
    this.totalOperations = 0;
    this.lastMemoryUpdate = 0;
  }

  /**
   * バッファーサイズを動的に調整
   */
  adjustBufferSize(newSize: number): void {
    // 新しいバッファーを作成
    const newRenderTimes = new CircularBuffer<PerformanceEvent>(
      newSize,
      (event) => event.duration
    );
    const newExportTimes = new CircularBuffer<PerformanceEvent>(
      newSize,
      (event) => event.duration
    );

    // 既存のデータを新しいバッファーに移行
    const latestRenderEvents = this.renderTimes.getLatestN(newSize);
    const latestExportEvents = this.exportTimes.getLatestN(newSize);

    latestRenderEvents.forEach(event => newRenderTimes.push(event));
    latestExportEvents.forEach(event => newExportTimes.push(event));

    // バッファーを置き換え
    this.renderTimes = newRenderTimes;
    this.exportTimes = newExportTimes;
  }
} 