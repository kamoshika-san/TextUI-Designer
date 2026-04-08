import type { TextUIDSL } from '../domain/dsl-types';
import { loadDslWithIncludesFromPath } from '../dsl/load-dsl-with-includes';
import { CacheManager } from '../utils/cache-manager';
import { DiffManager } from './metrics/diff-manager';
import { PerformanceMonitor } from '../utils/performance-monitor';
import { ConfigManager } from '../utils/config-manager';
import type { ExportOptions, Exporter } from './export-types';
import { populateBuiltInExporters } from './built-in-exporter-registry';
import type { ExportPipelineDeps } from './export-pipeline';
import { OptimizingExportExecutor } from './export-optimizing-executor';
import { runBatchExport } from './export-batch';
import { createPerformanceMonitorExportObserver } from './export-metrics-observer';
import {
  buildRenderTargetsFromDiffResult,
  createDiffResultSkeleton,
  createNormalizedDiffDocument,
  type DiffRenderTarget
} from '../core/textui-core-diff';
import { Logger } from '../utils/logger';

/**
 * ユーザー向けの export 結果を組み立てる **本流**（ファイル読込・形式に応じた `Exporter`・`CacheManager`）と、
 * **観測**（DSL 差分・キャッシュヒット等のメトリクスを `PerformanceMonitor` へ送る処理）を 1 インスタンスで束ねる。
 *
 * - **本流**: `exportFromFile` / `batchExport` が返す文字列・ファイル出力。高速化の主手段は **キャッシュ再利用**。
 * - **観測**: `DiffManager` の差分はメトリクス／レポート用（増分レンダーには未使用）。経路は `docs/export-instrumentation.md` と `docs/adr/0007-export-diff-purpose.md`。
 */
export class ExportManager {
  private exporters: Map<string, Exporter> = new Map();
  private cacheManager: CacheManager;
  private diffManager: DiffManager;
  private performanceMonitor: PerformanceMonitor;
  private readonly maxConcurrentOperations: number;
  private readonly optimizingExecutor: OptimizingExportExecutor;
  private readonly exportSnapshots = new Map<string, TextUIDSL>();
  private readonly logger = new Logger('ExportManager');
  /** Last reason incremental route was downgraded to full rerender. Exposed for future observability. */
  lastIncrementalDowngradeReason: string | null = null;

  constructor() {
    populateBuiltInExporters(this.exporters);

    const settings = ConfigManager.getPerformanceSettings();
    this.maxConcurrentOperations = Math.max(1, settings.maxConcurrentOperations || 3);

    this.cacheManager = new CacheManager({
      ttl: settings.cacheTTL,
      maxSize: 100
    });

    this.diffManager = new DiffManager();
    this.performanceMonitor = PerformanceMonitor.getInstance();

    this.optimizingExecutor = new OptimizingExportExecutor(() => this.pipelineDeps());
  }

  private pipelineDeps(): ExportPipelineDeps {
    return {
      cacheManager: this.cacheManager,
      diffManager: this.diffManager,
      performanceMonitor: this.performanceMonitor,
      metricsObserver: createPerformanceMonitorExportObserver(this.performanceMonitor),
      exporters: this.exporters
    };
  }

  registerExporter(format: string, exporter: Exporter): void {
    this.exporters.set(format, exporter);
  }

  unregisterExporter(format: string): boolean {
    return this.exporters.delete(format);
  }

  /**
   * **本流**エントリ: DSL を読み、キャッシュまたはフルレンダーで export 結果を返す。
   * 全体時間は `PerformanceMonitor.measureExportTime` で観測（export 完了イベント）。
   */
  async exportFromFile(filePath: string, options: ExportOptions): Promise<string> {
    return this.performanceMonitor.measureExportTime(async () => {
      try {
        const { dsl } = loadDslWithIncludesFromPath(filePath);

        const exporter = this.exporters.get(options.format);
        if (!exporter) {
          throw new Error(`Unsupported export format: ${options.format}`);
        }

        const normalizedOptions: ExportOptions = {
          ...options,
          sourcePath: options.sourcePath ?? filePath
        };

        let result: string;
        const incrementalTargets = this.buildIncrementalRenderTargets(dsl, normalizedOptions);
        if (incrementalTargets) {
          result = (await this.exportWithDiffUpdate(dsl, {
            ...normalizedOptions,
            incrementalRenderTargets: incrementalTargets
          })).result;
        } else {
          result = await this.optimizingExecutor.runOptimizedExport(dsl, normalizedOptions);
        }

        if (normalizedOptions.sourcePath) {
          this.exportSnapshots.set(normalizedOptions.sourcePath, dsl);
        }
        return result;
      } catch (error) {
        throw new Error(`Export failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    });
  }

  private buildIncrementalRenderTargets(
    dsl: TextUIDSL,
    options: ExportOptions
  ): DiffRenderTarget[] | undefined {
    const sourcePath = options.sourcePath;
    if (options.enableIncrementalDiffRoute !== true || !sourcePath) {
      return undefined;
    }
    const previousDsl = this.exportSnapshots.get(sourcePath);
    if (!previousDsl) {
      return undefined;
    }

    let renderTargets: DiffRenderTarget[];
    try {
      const previous = createNormalizedDiffDocument(previousDsl, { side: 'previous', sourcePath });
      const next = createNormalizedDiffDocument(dsl, { side: 'next', sourcePath });
      renderTargets = buildRenderTargetsFromDiffResult(createDiffResultSkeleton(previous, next));
    } catch (error) {
      const reason = `diff-computation-error: ${error instanceof Error ? error.message : String(error)}`;
      this.lastIncrementalDowngradeReason = reason;
      this.logger.warn(`Incremental route downgraded to full rerender — ${reason}`);
      return undefined;
    }

    if (renderTargets.length === 0) {
      const reason = 'empty-render-targets';
      this.lastIncrementalDowngradeReason = reason;
      this.logger.warn(`Incremental route downgraded to full rerender — ${reason}`);
      return undefined;
    }

    const unresolved = renderTargets.filter(t => t.resolution !== 'resolved');
    if (unresolved.length > 0) {
      const reason = `unresolved-targets: ${unresolved.length}/${renderTargets.length}`;
      this.lastIncrementalDowngradeReason = reason;
      this.logger.warn(`Incremental route downgraded to full rerender — ${reason}`);
      return undefined;
    }

    this.lastIncrementalDowngradeReason = null;
    return renderTargets;
  }

  /**
   * キャッシュ短絡を含む経路。`DiffManager` の結果で分岐するが、**コンポーネント単位の増分描画には使わない**。
   */
  async exportWithDiffUpdate(
    dsl: TextUIDSL,
    options: ExportOptions
  ): Promise<{
    result: string;
    isFullUpdate: boolean;
    changedComponents: number[];
  }> {
    return this.optimizingExecutor.runExportWithDiffUpdate(dsl, options);
  }

  async batchExport(files: Array<{ path: string; options: ExportOptions }>): Promise<Map<string, string>> {
    return runBatchExport(
      files,
      this.maxConcurrentOperations,
      (path, options) => this.exportFromFile(path, options),
      this.performanceMonitor
    );
  }

  clearCache(): void {
    this.cacheManager.clear();
    this.diffManager.reset();
    this.exportSnapshots.clear();
  }

  clearFormatCache(format: string): void {
    if (format) {
      this.cacheManager.clearFormat(format);
    }
  }

  /** **観測**用: キャッシュ・直近 diff・集約メトリクスのスナップショット（本流の戻り値ではない）。 */
  getPerformanceStats(): {
    cacheStats: { size: number; maxSize: number; hitRate: number };
    diffStats: { totalChanges: number; changeRate: number; efficiency: number };
    exportMetrics: {
      renderTime: number;
      cacheHitRate: number;
      diffEfficiency: number;
      memoryUsage: number;
      totalOperations: number;
    };
  } {
    const cacheStats = this.cacheManager.getStats();
    const exportMetrics = this.performanceMonitor.getMetrics();

    const lastDiff = this.diffManager.getLastDiffResult();
    const diffStats = lastDiff
      ? this.diffManager.getDiffStats(lastDiff)
      : { totalChanges: 0, changeRate: 0, efficiency: 100 };

    return {
      cacheStats,
      diffStats,
      exportMetrics
    };
  }

  /** 人間可読な **観測**レポート（デバッグ・チューニング用）。 */
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

  getSupportedFormats(): string[] {
    return Array.from(this.exporters.keys());
  }

  getFileExtension(format: string): string {
    const exporter = this.exporters.get(format);
    return exporter ? exporter.getFileExtension() : '';
  }

  dispose(): void {
    this.cacheManager.clear();
    this.diffManager.reset();
    this.performanceMonitor.dispose();
    this.exportSnapshots.clear();
  }
}
