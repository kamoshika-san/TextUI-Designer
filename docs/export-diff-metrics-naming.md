# Export の diff 関連命名（metrics 寄り改善案）

外部アーキ **Phase 0** の設計メモ。**コードのリネームは行わない**（実装は別チケット）。観測用の指標と、本流の DSL 差分計算（`DiffManager`）が **同じ語「diff」**で読み取られる余地を減らすための案をまとめる。

## 現状の呼び名（整理）

| 名前 | 所在（代表） | 本流 / 観測 | 役割の要約 |
|------|----------------|-------------|------------|
| `DiffManager.computeDiff` | `src/utils/diff-manager.ts` | **本流（状態整合）** | 前回 DSL との差分と内部状態。無効化すると次回 export の前提が壊れうる。 |
| `getDiffStats` / `diffStats.efficiency` | `DiffManager` / `export-manager` | **主に表示・診断** | 直近比較に基づく統計（レポート文脈）。 |
| `recordDiffEfficiency` | `PerformanceMonitor` | **観測** | 変更コンポーネント数と総数から「効率」をメトリクスへ。`export-pipeline` から **設定ガード**付きで呼ぶ。 |
| `metrics.diffEfficiency`（ローリング等） | `PerformanceMonitor` | **観測** | レポート用の集約値。 |
| `exportMetrics.diffEfficiency` | `export-manager` の統計 | **観測** | ユーザー向けレポート文字列に含まれる。 |

境界の説明は [export-instrumentation.md](export-instrumentation.md) を参照。

## 課題（なぜ紛らわしいか）

- **`diff`** が「**必ず実行される差分計算**（本流）」と「**記録してよい効率指標**（観測）」の両方に付いている。
- **`efficiency`** が DiffManager の統計と PerformanceMonitor のローリング指標の両方で使われ、**同じ英単語で別概念**になりうる。

## 命名改善案（将来リネーム時の候補）

実装チケットで採用する際は **公開 API・ログ・設定キー**への影響を個別に洗うこと。

### 観測 API（`PerformanceMonitor`）

| 現状 | 案 | 意図 |
|------|-----|------|
| `recordDiffEfficiency` | `recordExportPipelineChangedComponentRatio` | **export パイプライン**上の「変更割合」観測であることを明示 |
| （同上） | `recordObservedExportDiffSample` | **観測サンプル**であることを前置（`observed` / `metrics` プレフィックス） |

### メトリクスフィールド

| 現状 | 案 | 意図 |
|------|-----|------|
| `metrics.diffEfficiency` | `metrics.exportPipelineRollingChangeRatio` | **ローリング**かつ **export パイプライン**由来であること |
| `exportMetrics.diffEfficiency` | `exportMetrics.observedRollingEfficiency` | レポート用であるが **観測値**であること |

### 本流は名称変更しない方がよい例

- `DiffManager` の `computeDiff` / `getDiffStats` — **プロダクトの差分そのもの**なので、`Diff` を残してよい。観測側だけ `Metrics` / `Observed` を付けると対比がつく。

## 影響範囲（リネーム実装時の確認先）

- `src/utils/performance-monitor.ts` — メソッド名・`metrics` 型・レポート文字列
- `src/exporters/export-pipeline.ts` — 呼び出し
- `src/exporters/export-manager.ts` — 統計オブジェクトのキー・表示文言
- `tests/unit/` — PerformanceMonitor・export 関連

## 実装チケットに引き継ぐときの受け入れメモ

- [ ] 設定 `enablePerformanceLogs` とドキュメント [export-instrumentation.md](export-instrumentation.md) の用語を同期する
- [ ] ユーザー向けレポート（`getPerformanceStats` 等）のラベルを「観測」「直近 DSL 比較」で区別できるようにする
