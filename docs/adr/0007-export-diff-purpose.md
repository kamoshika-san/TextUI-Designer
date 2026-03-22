# ADR 0007: Export における DSL diff の位置づけ（観測 vs 将来の増分レンダー）

## ステータス

採用（2026-03-22）

## コンテキスト

- `DiffManager` は DSL の前回版との差分を計算し、内部状態を更新する。
- 同じ「diff」という語が、**(A) 観測・レポート用メトリクス**と **(B) 将来ありうる増分レンダー（コンポーネント単位の省略描画）** の両方に読み取られる余地を生んでいた。

## 決定

1. **現行の正しい位置づけ**  
   - **観測・メトリクス／レポート用**が主目的。  
   - **増分レンダー（export 結果の部分更新）の前提にはまだ使わない**。  
   - 本流の高速化の主手段は **キャッシュ**（および `exportWithDiffUpdate` 経路でのキャッシュ短絡）。

2. **将来（増分レンダー）を検討するときの前提**  
   - 別 ADR / チケットで **スキーマ・出力形式・互換**を定義するまで、diff を「描画省略の入力」として昇格しない。  
   - 昇格する場合は **観測用の `computeDiff` と共有するか、専用の Incremental モジュールに分岐するか**を明示的に選ぶ。

3. **実装上の境界**  
   - パイプライン本流は `ExportPipelineMetricsObserver`（`src/exporters/export-metrics-observer.ts`）経由で観測にのみ通知し、`PerformanceMonitor` の cache/diff 記録を直接散在させない（T-206）。

## 結果

- 「今は観測」「将来は別判断」と読める。不要な複雑さ（diff を本流の最適化本体と誤解すること）を削る方針と整合する。

## 関連ドキュメント

- [export-diff-observation-path.md](../export-diff-observation-path.md)
- [export-instrumentation.md](../export-instrumentation.md)
