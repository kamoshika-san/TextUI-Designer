import type { TextUIDSL } from '../domain/dsl-types';
import type { ExportOptions } from './export-types';
import { runExportWithDiffUpdate, runOptimizedExport, type ExportPipelineDeps } from './export-pipeline';

/**
 * キャッシュ・差分・観測を束ねた export 経路（ExportManager から合成注入）。
 * T-107: registry/dispatch 本体と観測レイヤの境界を読みやすくするための第1スライス。
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
