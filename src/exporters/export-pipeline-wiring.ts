import type { TextUIDSL } from '../domain/dsl-types';
import { CacheManager } from '../utils/cache-manager';
import type { PerformanceMonitor } from '../utils/performance-monitor';
import { DiffManager } from './metrics/diff-manager';
import type { ExportOptions } from './export-types';
import type { ExportPipelineDeps, ExportWithDiffUpdateResult } from './export-pipeline';
import { runExportWithDiffUpdate, runOptimizedExport } from './export-pipeline';
import { createPerformanceMonitorExportObserver } from './export-metrics-observer';
import type { ExporterRegistryCoordinator } from './exporter-registry-coordinator';

export type { ExportWithDiffUpdateResult } from './export-pipeline';

export interface ExportPerformanceStats {
  cacheStats: { size: number; maxSize: number; hitRate: number };
  diffStats: { totalChanges: number; changeRate: number; efficiency: number };
  exportMetrics: {
    renderTime: number;
    cacheHitRate: number;
    diffEfficiency: number;
    memoryUsage: number;
    totalOperations: number;
  };
  incrementalRouteMetrics: ReturnType<PerformanceMonitor['getIncrementalRouteMetrics']>;
}

interface ExportPipelineWiringDeps {
  registry: ExporterRegistryCoordinator;
  performanceMonitor: PerformanceMonitor;
  cacheTTL: number;
  cacheMaxSize?: number;
}

/**
 * cache / diff / metrics を束ねた export pipeline の wiring。
 */
export class ExportPipelineWiring {
  private readonly cacheManager: CacheManager;
  private readonly diffManager = new DiffManager();
  private readonly performanceMonitor: PerformanceMonitor;
  private readonly registry: ExporterRegistryCoordinator;

  constructor(deps: ExportPipelineWiringDeps) {
    this.registry = deps.registry;
    this.performanceMonitor = deps.performanceMonitor;
    this.cacheManager = new CacheManager({
      ttl: deps.cacheTTL,
      maxSize: deps.cacheMaxSize ?? 100
    });
  }

  createPipelineDeps(): ExportPipelineDeps {
    return {
      cacheManager: this.cacheManager,
      diffManager: this.diffManager,
      performanceMonitor: this.performanceMonitor,
      metricsObserver: createPerformanceMonitorExportObserver(this.performanceMonitor),
      exporters: this.registry.getPipelineExporters()
    };
  }

  async exportWithDiffUpdate(
    dsl: TextUIDSL,
    options: ExportOptions
  ): Promise<ExportWithDiffUpdateResult> {
    return runExportWithDiffUpdate(dsl, options, this.createPipelineDeps(), (targetDsl, targetOptions) =>
      runOptimizedExport(targetDsl, targetOptions, this.createPipelineDeps())
    );
  }

  clearCache(): void {
    this.cacheManager.clear();
    this.diffManager.reset();
  }

  clearFormatCache(format: string): void {
    if (format) {
      this.cacheManager.clearFormat(format);
    }
  }

  getPerformanceStats(): ExportPerformanceStats {
    const cacheStats = this.cacheManager.getStats();
    const exportMetrics = this.performanceMonitor.getMetrics();
    const incrementalRouteMetrics = this.performanceMonitor.getIncrementalRouteMetrics();

    const lastDiff = this.diffManager.getLastDiffResult();
    const diffStats = lastDiff
      ? this.diffManager.getDiffStats(lastDiff)
      : { totalChanges: 0, changeRate: 0, efficiency: 100 };

    return {
      cacheStats,
      diffStats,
      exportMetrics,
      incrementalRouteMetrics
    };
  }

  generatePerformanceReport(): string {
    const stats = this.getPerformanceStats();
    const report = this.performanceMonitor.generateReport();

    return `
# 最適化エクスポートマネージャー パフォーマンスレポート

${report}

## キャッシュ統計
- キャッシュサイズ: ${stats.cacheStats.size}/${stats.cacheStats.maxSize}
- キャッシュヒット率: ${stats.cacheStats.hitRate.toFixed(1)}%

## 差分更新統計
- 総変更数: ${stats.diffStats.totalChanges}
- 変更率: ${stats.diffStats.changeRate.toFixed(1)}%
- 効率（直近 DSL 比較）: ${stats.diffStats.efficiency.toFixed(1)}%
- ローリング差分効率（\`exportMetrics.diffEfficiency\`）: ${stats.exportMetrics.diffEfficiency.toFixed(1)}%

> 差分は現状レンダー省略には使わず、上記は観測用。実際の省略は主にキャッシュヒット。

## 最適化効果
- 平均レンダリング時間: ${stats.exportMetrics.renderTime.toFixed(2)}ms
- メモリ使用量: ${stats.exportMetrics.memoryUsage.toFixed(2)}MB
- 総操作数: ${stats.exportMetrics.totalOperations}
    `.trim();
  }

  dispose(): void {
    this.cacheManager.clear();
    this.diffManager.reset();
  }
}
