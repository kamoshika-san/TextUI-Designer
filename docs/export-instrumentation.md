# Export / プレビューにおける観測（instrumentation）境界

外部レビュー指摘（観測専用ロジックと本流の混在）への対応として、**本流必須**と**観測専用**の境界を文書化する。

## 1. 用語

| 区分 | 説明 | 典型例 |
|------|------|--------|
| **本流** | ユーザー向けの export / プレビュー結果を決める処理 | `exporter.export`、キャッシュの get/set |
| **観測** | デバッグ・メトリクス・ログ。無効化しても**出力互換を変えない**ことが望ましい | `PerformanceMonitor.recordDiffEfficiency`、開発時 `console.debug` |
| **状態整合** | 次回計算のための内部状態。観測ではないが、最適化の副産物として diff と同居しうる | `DiffManager.computeDiff` が保持する前回 DSL |

## 2. Export パイプライン（`src/exporters/export-pipeline.ts`）

- **キャッシュ**: ヒット時は本流が早期 return。`recordCacheHit` は `PerformanceMonitor` 経由で **設定 `performance.enablePerformanceLogs`（opt-in）** に従う。
- **`DiffManager.computeDiff`**: 前回との差分を計算し内部状態を更新。**メトリクス記録とは切り離して常に実行**（省略すると状態が壊れる）。
- **`recordDiffEfficiency`**: diff の「効率」だけを観測用に送る。呼び出し側で `isExportPipelineMetricsEnabled()`（= `export-instrumentation.ts`）により **明示的にガード**し、本流の責務から観測を読み分けやすくする。

## 3. WebView プレビュー（`src/renderer/webview.tsx`）

- `mergeDslWithPrevious` などの **計測用タイミング**は `isDevelopmentMode`（`__TUI_DEV_MODE__` / `textui-dev=true`）のときのみ。
- 本番相当パスでは計測コストを避ける。

## 4. 設定との対応

| 設定キー | 効く範囲 |
|----------|----------|
| `textui-designer.performance.enablePerformanceLogs` | `PerformanceMonitor` 全般 + export パイプラインの diff 効率メトリクス（上記ガードと一致） |

## 5. 関連コード

- `src/exporters/export-instrumentation.ts` — export 観測の有効判定
- `src/utils/performance-monitor.ts` — イベント蓄積（内部でも `enablePerformanceLogs` で no-op）
- `src/exporters/metrics/diff-manager.ts` — DSL 差分（**メトリクス／レポート用**モジュール。経路は [export-diff-observation-path.md](export-diff-observation-path.md)）

## 6. 受け入れの見方（チケット T-20260321-041）

- 「観測専用」が **docs とコード上のコメント / `export-instrumentation`** で追えること。
- 通常パスで **不要な観測処理が減った**ことは、`recordDiffEfficiency` を設定オフ時に呼ばない（呼んでも内部 no-op だった箇所を、呼び出し側で明示）として説明できること。

## 7. 関連（命名の改善案・設計メモ）

- [export-diff-metrics-naming.md](export-diff-metrics-naming.md) — diff / metrics 系の呼び名を整理した **将来リネーム案**（コード変更は別チケット）
