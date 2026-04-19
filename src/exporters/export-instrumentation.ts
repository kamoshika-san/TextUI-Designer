import { ConfigManager } from '../utils/config-manager';

/**
 * Export パイプラインにおける「観測専用」処理の有効判定。
 *
 * - `true`: `PerformanceMonitor` へ diff 効率などのメトリクスを送る（`textui-designer.performance.enablePerformanceLogs`）。
 * - `false`: メトリクス記録を省略。本流の export 結果・`DiffManager` の状態更新とは独立。
 *
 * 正本ドキュメント: `docs/current/theme-export-rendering/export-instrumentation.md`
 */
export function isExportPipelineMetricsEnabled(): boolean {
  return ConfigManager.getPerformanceSettings().enablePerformanceLogs;
}
