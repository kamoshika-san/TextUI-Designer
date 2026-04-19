# ExportManager における観測と最適化の分離（方針）

外部アーキ **Phase 5** の方針メモ。大規模な責務分割の **詳細は別チケット**。**T-107 第1スライス**として `OptimizingExportExecutor` を導入済み（下記）。

## T-049（観測とキャッシュの境界）との役割分担

| 区分 | 主なスコープ |
|------|----------------|
| **T-049**（チケット） | リポジトリ横断で **「公開 API と観測・キャッシュ実装の境界」**を宣言する **一般論**（`docs/current/runtime-boundaries/observability-and-cache-boundary.md` 想定）。 |
| **本文書（T-058）** | **`ExportManager` と export 経路に閉じた**責務の切り方。cache / diff / performance を **Export 固有**のモジュール像に分ける **将来像**のみを書く。 |

T-049 が「外から見て何を隠すか」に寄せるのに対し、本文書は **Export の合成（composition）**が読み手に負荷をかけている点を分解する。

## T-107（第1スライス）

`OptimizingExportExecutor`（`src/exporters/export-optimizing-executor.ts`）が **`ExportPipelineDeps` を束ねて** `export-pipeline` の `runOptimizedExport` / `runExportWithDiffUpdate` を呼び出し、`ExportManager` は **レジストリ登録・`CacheManager` / `DiffManager` / `PerformanceMonitor` の生成**と **計測ラップ（`measureExportTime`）**に寄せる。キャッシュ／diff／メトリクス記録の意味論は `export-pipeline`・[export-instrumentation.md](export-instrumentation.md) の既存契約を変えない。

## 現状の整理（コードベース）

`ExportManager`（`src/exporters/export-manager.ts`）は概ね次を **同一クラス内で合成**している（実行経路の一部は上記 `OptimizingExportExecutor` へ委譲）。

- **`CacheManager`** — エクスポート結果の再利用（本流の高速化に直結しうる）
- **`DiffManager`** — 前回 DSL との差分。**状態整合**のため本流でも利用。観測用データの源泉でもある（[export-instrumentation.md](export-instrumentation.md)）
- **`PerformanceMonitor`** — 計測・レポート。**設定で no-op になりうる観測**（`enablePerformanceLogs`）

`export-pipeline` は本流の export と、`isExportPipelineMetricsEnabled()` による **観測呼び出しのガード**を併置している。

## 目標とする概念的な分離（名前は将来のモジュール像）

実装時のクラス名は別チケットで決める。ここでは **責務ラベル**のみ示す。

1. **`ExportExecution`（本流）**  
   - exporter の解決 → `export` 実行 → 必要ならキャッシュ書き込み  
   - **ユーザー向け出力を決める最短経路**を保つ

2. **`ExportCache`（結果再利用）**  
   - ヒット／ミス・TTL・キー設計  
   - **入出力の意味**を変えない（キャッシュ無効時と同じ結果であることが望ましい）

3. **`ExportInstrumentation`（観測・レポート）**  
   - `record*`、diff 効率サンプル、パフォーマンスレポート文言  
   - **オフにしても export 結果互換を変えない**ことが前提（既存の `export-instrumentation` ガードと整合）

## diff とメトリクス

- 外部アーキ案: **実際に増分 export を使わないなら**、diff 由来の処理を **コアパイプラインから外し**、**レポート専用**に閉じる。  
- 現状の `DiffManager` は **状態整合**のため本流と切り離しにくい点に注意（[export-instrumentation.md](export-instrumentation.md) の「状態整合」節）。  
- 命名の整理案: [export-diff-metrics-naming.md](export-diff-metrics-naming.md)

## performance report

- **runtime inspection 専用**に寄せ、export 本体の読みやすさを優先する方向（外部アーキ案）。

## 関連ドキュメント

- [export-instrumentation.md](export-instrumentation.md) — 本流 / 観測 / `DiffManager` の既存の境界説明
- [export-diff-metrics-naming.md](export-diff-metrics-naming.md) — メトリクス寄りの命名改善案（設計のみ）
