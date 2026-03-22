import type { PerformanceMonitor } from '../utils/performance-monitor';

/**
 * Export パイプラインから **観測レイヤ**へだけ通知する窓口。
 * 本流（キャッシュ get/set・`exporter.export`）は `PerformanceMonitor` を直接参照せず、
 * ここ経由でキャッシュ参照結果・diff 由来メトリクスを送る。
 */
export interface ExportPipelineMetricsObserver {
  /** キャッシュ lookup の結果。`hit===true` のとき本流は早期 return しうる。 */
  onCacheLookup(hit: boolean): void;
  /**
   * 観測専用: 変更コンポーネント数から算出したサンプルを記録する。
   * 呼び出し側で `isExportPipelineMetricsEnabled()` 等のガードを行うこと。
   */
  onExportDiffMetricsSample(changedComponents: number, totalComponents: number): void;
}

/** テストまたは観測オフ時に使う空実装 */
export const noopExportPipelineMetricsObserver: ExportPipelineMetricsObserver = {
  onCacheLookup(): void {
    /* no-op */
  },
  onExportDiffMetricsSample(): void {
    /* no-op */
  }
};

/** `PerformanceMonitor` の cache / diff メトリクス API に橋渡しする既定オブザーバ */
export function createPerformanceMonitorExportObserver(
  performanceMonitor: PerformanceMonitor
): ExportPipelineMetricsObserver {
  return {
    onCacheLookup(hit: boolean): void {
      performanceMonitor.recordCacheHit(hit);
    },
    onExportDiffMetricsSample(changedComponents: number, totalComponents: number): void {
      performanceMonitor.recordDiffEfficiency(changedComponents, totalComponents);
    }
  };
}
