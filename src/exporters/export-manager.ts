import * as fs from 'fs';
import * as YAML from 'yaml';
import type { TextUIDSL } from '../domain/dsl-types';
import { CacheManager } from '../utils/cache-manager';
import { DiffManager } from './metrics/diff-manager';
import { PerformanceMonitor } from '../utils/performance-monitor';
import { ConfigManager } from '../utils/config-manager';
import type { ExportOptions, Exporter } from './export-types';
import { populateBuiltInExporters } from './built-in-exporter-registry';
import { runOptimizedExport, runExportWithDiffUpdate, type ExportPipelineDeps } from './export-pipeline';
import { runBatchExport } from './export-batch';

/**
 * パフォーマンス最適化されたエクスポートマネージャー
 * キャッシュと差分更新を活用して高速化を実現
 */
export class ExportManager {
  private exporters: Map<string, Exporter> = new Map();
  private cacheManager: CacheManager;
  private diffManager: DiffManager;
  private performanceMonitor: PerformanceMonitor;
  private readonly maxConcurrentOperations: number;

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
  }

  private pipelineDeps(): ExportPipelineDeps {
    return {
      cacheManager: this.cacheManager,
      diffManager: this.diffManager,
      performanceMonitor: this.performanceMonitor,
      exporters: this.exporters
    };
  }

  registerExporter(format: string, exporter: Exporter): void {
    this.exporters.set(format, exporter);
  }

  unregisterExporter(format: string): boolean {
    return this.exporters.delete(format);
  }

  async exportFromFile(filePath: string, options: ExportOptions): Promise<string> {
    return this.performanceMonitor.measureExportTime(async () => {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');

        const dsl = await new Promise<TextUIDSL>((resolve, reject) => {
          setImmediate(() => {
            try {
              const parsed = YAML.parse(content) as TextUIDSL;
              resolve(parsed);
            } catch (error) {
              reject(error);
            }
          });
        });

        const exporter = this.exporters.get(options.format);
        if (!exporter) {
          throw new Error(`Unsupported export format: ${options.format}`);
        }

        const normalizedOptions: ExportOptions = {
          ...options,
          sourcePath: options.sourcePath ?? filePath
        };

        return await runOptimizedExport(dsl, normalizedOptions, this.pipelineDeps());
      } catch (error) {
        throw new Error(`Export failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    });
  }

  async exportWithDiffUpdate(
    dsl: TextUIDSL,
    options: ExportOptions
  ): Promise<{
    result: string;
    isFullUpdate: boolean;
    changedComponents: number[];
  }> {
    return runExportWithDiffUpdate(dsl, options, this.pipelineDeps(), (d, o) =>
      runOptimizedExport(d, o, this.pipelineDeps())
    );
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
  }

  clearFormatCache(format: string): void {
    if (format) {
      this.cacheManager.clearFormat(format);
    }
  }

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
  }
}
