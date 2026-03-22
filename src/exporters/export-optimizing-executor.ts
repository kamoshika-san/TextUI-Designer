import type { TextUIDSL } from '../domain/dsl-types';
import type { ExportOptions } from './export-types';
import { runExportWithDiffUpdate, runOptimizedExport, type ExportPipelineDeps } from './export-pipeline';

/**
 * **本流**の `runOptimizedExport` / `runExportWithDiffUpdate` を束ねる薄いオーケストレータ。
 * キャッシュ・`exporter.export` が成果物を決め、差分・メトリクスは `ExportPipelineDeps.metricsObserver` 経由で **観測**に送る（T-206）。
 */
export class OptimizingExportExecutor {
  constructor(private readonly getDeps: () => ExportPipelineDeps) {}

  async runOptimizedExport(dsl: TextUIDSL, options: ExportOptions): Promise<string> {
    return runOptimizedExport(dsl, options, this.getDeps());
  }

  async runExportWithDiffUpdate(
    dsl: TextUIDSL,
    options: ExportOptions
  ): Promise<{
    result: string;
    isFullUpdate: boolean;
    changedComponents: number[];
  }> {
    return runExportWithDiffUpdate(dsl, options, this.getDeps(), (d, o) => this.runOptimizedExport(d, o));
  }
}
