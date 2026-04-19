# Export の diff 利用経路（現状整理）

**意思決定の正本**: [ADR 0007: diff の位置づけ（観測 vs 将来の増分レンダー）](adr/0007-export-diff-purpose.md)

チケット **T-20260321-079** の方針: **差分計算は観測・メトリクス／レポート用**であり、**HTML 等への増分レンダー（コンポーネント単位の省略描画）には未使用**。コードは `src/exporters/metrics/diff-manager.ts` に配置し、本流 export からの「誤って最適化本体だと読む」余地を減らす。

## 利用経路（箇条書き）

- **`ExportManager`**（`src/exporters/export-manager.ts`）が `DiffManager` インスタンスを保持。
- **`runOptimizedExport`**（`src/exporters/export-pipeline.ts`）がキャッシュ未ヒット時に `diffManager.computeDiff(dsl)` を実行し、変更がある場合のみ **`isExportPipelineMetricsEnabled()`** が真のとき `PerformanceMonitor.recordDiffEfficiency` を呼ぶ（観測）。
- **`runExportWithDiffUpdate`** が `computeDiff` の結果で「変更なしかつキャッシュあり」のとき早期 return（**主な省略はキャッシュ**）。diff はこの分岐の入力であり、**描画の部分更新には使っていない**。
- **`getPerformanceStats` / `generatePerformanceReport`** が `getLastDiffResult` と `getDiffStats` を **レポート用**に参照。

## 方針メモ（第1スライス）

- **採用**: メトリクス側モジュールへの隔離（上記パス配置）。incremental export への昇格は別チケットで検討。
- **本流の高速化**は引き続き **キャッシュ**（および `exportWithDiffUpdate` 経路のキャッシュ短絡）が中心。

関連: [export-instrumentation.md](export-instrumentation.md)、[export-diff-metrics-naming.md](export-diff-metrics-naming.md)。
