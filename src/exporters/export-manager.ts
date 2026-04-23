import type { NavigationFlowDSL, TextUIDSL } from '../domain/dsl-types';
import { loadDslWithIncludesFromPath } from '../dsl/load-dsl-with-includes';
import type { PerformanceMonitor } from '../utils/performance-monitor';
import type { ExportOptions, Exporter } from './export-types';
import { runBatchExport } from './export-batch';
import { ExportManagerCompositionRoot } from './export-manager-composition-root';
import { ExporterRegistryCoordinator } from './exporter-registry-coordinator';
import { ExportPipelineWiring } from './export-pipeline-wiring';
import type { ExportPerformanceStats, ExportWithDiffUpdateResult } from './export-pipeline-wiring';
import { ExportObservabilityRecorder } from './export-observability-recorder';
import { ExportExecutionFacade } from './export-execution-facade';
import { ExportSnapshotState } from './export-snapshot-state';

/**
 * ユーザー向けの export 結果を組み立てる **本流**（ファイル読込・形式に応じた `Exporter`・`CacheManager`）と、
 * **観測**（DSL 差分・キャッシュヒット等のメトリクスを `PerformanceMonitor` へ送る処理）を 1 インスタンスで束ねる。
 *
 * - **本流**: `exportFromFile` / `batchExport` が返す文字列・ファイル出力。高速化の主手段は **キャッシュ再利用**。
 * - **観測**: `DiffManager` の差分はメトリクス／レポート用（増分レンダーには未使用）。経路は `docs/current/theme-export-rendering/export-instrumentation.md` と `docs/adr/0007-export-diff-purpose.md`。
 */
export class ExportManager {
  private readonly registry: ExporterRegistryCoordinator;
  private readonly pipelineWiring: ExportPipelineWiring;
  private readonly performanceMonitor: PerformanceMonitor;
  private readonly maxConcurrentOperations: number;
  private readonly snapshotState: ExportSnapshotState;
  private readonly observability: ExportObservabilityRecorder;
  private readonly executionFacade: ExportExecutionFacade;

  constructor() {
    const composition = ExportManagerCompositionRoot.compose();
    this.registry = composition.registry;
    this.pipelineWiring = composition.pipelineWiring;
    this.performanceMonitor = composition.performanceMonitor;
    this.maxConcurrentOperations = composition.maxConcurrentOperations;
    this.snapshotState = composition.snapshotState;
    this.observability = composition.observability;
    this.executionFacade = new ExportExecutionFacade({
      routePolicy: composition.routePolicy,
      snapshotState: this.snapshotState,
      observability: this.observability,
      pipelineDeps: () => this.pipelineWiring.createPipelineDeps(),
      runNavigationExporter: (dsl, options) => this.runNavigationExporter(dsl, options),
      exportWithDiffUpdate: (dsl, options) => this.exportWithDiffUpdate(dsl, options)
    });
  }

  get lastIncrementalDowngradeReason(): string | null {
    return this.observability.lastIncrementalDowngradeReason;
  }

  set lastIncrementalDowngradeReason(reason: string | null) {
    this.observability.setLastIncrementalDowngradeReason(reason);
  }

  registerExporter(format: string, exporter: Exporter): void {
    this.registry.register(format, exporter);
  }

  unregisterExporter(format: string): boolean {
    return this.registry.unregister(format);
  }

  /**
   * **本流**エントリ: DSL を読み、キャッシュまたはフルレンダーで export 結果を返す。
   * 全体時間は `PerformanceMonitor.measureExportTime` で観測（export 完了イベント）。
   */
  async exportFromFile(filePath: string, options: ExportOptions): Promise<string> {
    return this.performanceMonitor.measureExportTime(async () => {
      try {
        const { dsl } = loadDslWithIncludesFromPath(filePath);

        const normalizedOptions: ExportOptions = {
          ...options,
          sourcePath: options.sourcePath ?? filePath
        };
        this.registry.resolveOrThrow(normalizedOptions.format);
        const result = await this.executionFacade.export(dsl, normalizedOptions);
        this.executionFacade.rememberSnapshotIfPossible(dsl, normalizedOptions.sourcePath);
        return result;
      } catch (error) {
        throw new Error(`Export failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    });
  }

  private async runNavigationExporter(dsl: NavigationFlowDSL, options: ExportOptions): Promise<string> {
    const exporter = this.registry.resolveOrThrow(options.format);
    return exporter.export(dsl, options);
  }

  /**
   * キャッシュ短絡を含む経路。`DiffManager` の結果で分岐するが、**コンポーネント単位の増分描画には使わない**。
   */
  async exportWithDiffUpdate(
    dsl: TextUIDSL,
    options: ExportOptions
  ): Promise<ExportWithDiffUpdateResult> {
    return this.pipelineWiring.exportWithDiffUpdate(dsl, options);
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
    this.pipelineWiring.clearCache();
    this.snapshotState.clear();
  }

  clearFormatCache(format: string): void {
    this.pipelineWiring.clearFormatCache(format);
  }

  /** **観測**用: キャッシュ・直近 diff・集約メトリクスのスナップショット（本流の戻り値ではない）。 */
  getPerformanceStats(): ExportPerformanceStats {
    return this.pipelineWiring.getPerformanceStats();
  }

  /** 人間可読な **観測**レポート（デバッグ・チューニング用）。 */
  generatePerformanceReport(): string {
    return this.pipelineWiring.generatePerformanceReport();
  }

  getSupportedFormats(): string[] {
    return this.registry.getSupportedFormats();
  }

  getFileExtension(format: string): string {
    return this.registry.getFileExtension(format);
  }

  dispose(): void {
    this.pipelineWiring.dispose();
    this.performanceMonitor.dispose();
    this.snapshotState.clear();
  }
}
