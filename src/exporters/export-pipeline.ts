import type { TextUIDSL } from '../domain/dsl-types';
import type { ExportOptions, Exporter } from './export-types';
import type { CacheManager } from '../utils/cache-manager';
import type { DiffManager } from '../utils/diff-manager';
import type { PerformanceMonitor } from '../utils/performance-monitor';
import { isExportPipelineMetricsEnabled } from './export-instrumentation';

export interface ExportPipelineDeps {
  cacheManager: CacheManager;
  diffManager: DiffManager;
  performanceMonitor: PerformanceMonitor;
  exporters: Map<string, Exporter>;
}

/**
 * キャッシュ・差分メトリクス付きの 1 回のエクスポート。
 * 差分は観測用（増分レンダーには未使用）。省略は主にキャッシュヒット。
 */
export async function runOptimizedExport(
  dsl: TextUIDSL,
  options: ExportOptions,
  deps: ExportPipelineDeps
): Promise<string> {
  const { cacheManager, diffManager, performanceMonitor, exporters } = deps;

  const cachedResult = cacheManager.get(dsl, options.format);
  if (cachedResult) {
    performanceMonitor.recordCacheHit(true);
    return cachedResult;
  }

  performanceMonitor.recordCacheHit(false);

  const diffResult = diffManager.computeDiff(dsl);

  if (diffResult.hasChanges && isExportPipelineMetricsEnabled()) {
    const totalComponents = dsl.page?.components?.length || 0;
    performanceMonitor.recordDiffEfficiency(diffResult.changedComponents.length, totalComponents);
  }

  const exporter = exporters.get(options.format);
  if (!exporter) {
    throw new Error(`Unsupported export format: ${options.format}`);
  }

  const result = await exporter.export(dsl, options);
  cacheManager.set(dsl, options.format, result);
  return result;
}

export async function runExportWithDiffUpdate(
  dsl: TextUIDSL,
  options: ExportOptions,
  deps: ExportPipelineDeps,
  runOptimized: (d: TextUIDSL, o: ExportOptions) => Promise<string>
): Promise<{
  result: string;
  isFullUpdate: boolean;
  changedComponents: number[];
}> {
  const diffResult = deps.diffManager.computeDiff(dsl);

  if (!diffResult.hasChanges) {
    const cachedResult = deps.cacheManager.get(dsl, options.format);
    if (cachedResult) {
      deps.performanceMonitor.recordCacheHit(true);
      return {
        result: cachedResult,
        isFullUpdate: false,
        changedComponents: []
      };
    }
  }

  const result = await runOptimized(dsl, options);

  return {
    result,
    isFullUpdate: true,
    changedComponents: diffResult.changedComponents
  };
}
