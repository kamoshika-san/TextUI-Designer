import type { ExportOptions } from './export-types';
import type { PerformanceMonitor } from '../utils/performance-monitor';

export async function runBatchExport(
  files: Array<{ path: string; options: ExportOptions }>,
  maxConcurrent: number,
  exportFromFile: (path: string, options: ExportOptions) => Promise<string>,
  performanceMonitor: PerformanceMonitor
): Promise<Map<string, string>> {
  const results = new Map<string, string>();
  const batchStartTime = performance.now();
  const batchSize = maxConcurrent;

  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    const batchPromises = batch.map(async ({ path, options }) => {
      try {
        const result = await exportFromFile(path, options);
        return { path, result, success: true as const };
      } catch (error) {
        return {
          path,
          error: error instanceof Error ? error.message : String(error),
          success: false as const
        };
      }
    });

    const batchResults = await Promise.all(batchPromises);

    batchResults.forEach((entry) => {
      if (entry.success && entry.result) {
        results.set(entry.path, entry.result);
      } else if (!entry.success) {
        console.error(`Batch export failed for ${entry.path}:`, entry.error);
      }
    });
  }

  const batchDuration = performance.now() - batchStartTime;
  performanceMonitor.recordEvent('export', batchDuration, {
    batchSize: files.length,
    successCount: results.size,
    failureCount: files.length - results.size
  });

  return results;
}
