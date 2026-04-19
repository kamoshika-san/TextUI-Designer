# Refactoring Assessment (2026-03-13)

## 1) 今回の確認スコープ

- `src/` 配下の高複雑度ファイル（行数上位）と、責務集中しやすい `services/` `utils/` `core/` を重点確認。
- 既存実装の可読性・変更容易性・テストしやすさの観点で、優先度付きの改善候補を抽出。
- **本ドキュメントは評価のみ**。実装変更は未実施。

## 2) 総評

- 既に機能分割は進んでいるが、**オーケストレーション層に詳細ロジックが再集約**されている箇所が残る。
- 直近で価値が高いのは、
  1. テーマ処理の責務分割、
  2. WebViewメッセージ処理のハンドラ登録化、
  3. メモリトラッカーのカテゴリ別重複の削減。
- いずれも「不具合修正」より「変更時の衝突/回帰を減らす」目的のリファクタリング。

## 3) 優先度付きリファクタリング候補

### P1: `ThemeManager` の「定義」「ロード」「変換」を分離

対象: `src/services/theme-manager.ts`

観点:
- `defaultTokens` / `defaultComponents` の巨大な定義をクラス内で保持し、I/O・バリデーション・マージと同居している。
- `loadTheme` が「読み込み/検証/フォールバック/マージ/ログ」を一括で担当し、障害切り分けが難しい。
- `generateCSSVariables` にデバッグログとCSS生成が混在し、ユースケース別のテストが書きづらい。

提案:
- `src/theme/default-theme.ts` へデフォルト定義を移動。
- `ThemeLoader`（ファイル解決 + 継承展開）/ `ThemeValidator` / `ThemeCssVariableBuilder` を分離。
- `ThemeManager` は public API と依存連携のみ担当する façade に縮小。

期待効果:
- テーマ仕様追加時の変更範囲を局所化。
- 継承・検証・CSS変換を単体で検証しやすくなる。

---

### P1: `WebViewMessageHandler` のメッセージ分岐をハンドラマップ化

対象: `src/services/webview/webview-message-handler.ts`

観点:
- `handleMessage` の `switch` に複数メッセージ種別が集約され、機能追加のたびに本体が肥大化しやすい。
- `switchTheme` が「入力解決」「ファイル探索」「ThemeManager操作」「UI通知」を一括実行している。
- 結果として、個別機能（ジャンプ/テーマ切替/初期化）の単体テスト境界が曖昧。

提案:
- `Record<MessageType, (msg) => Promise<void>>` 形式のハンドラレジストリを導入。
- `ThemeSwitchService` を抽出し、`switchTheme` からパス解決と適用処理を分離。
- `showInformationMessage` など UI 副作用を薄い adapter 経由にしてテスト容易化。

期待効果:
- メッセージ種追加時の差分を最小化。
- 既存メッセージへの副作用回帰を抑制。

---

### P2: `TextUIMemoryTracker` のカテゴリ重複と集計コストを整理

対象: `src/utils/textui-memory-tracker.ts`

観点:
- `webview/yaml/diagnostics/render` で WeakMap・trackメソッド・集計処理が横並び実装されており、拡張時に重複が増えやすい。
- `calculateCategoryMemory` がカテゴリごとに `trackedObjects` 全走査するため、カテゴリ数増加時に計算コストが増大。
- Singleton内部にタイマー制御・レポート生成・追跡ロジックが同居。

提案:
- `MemoryCategoryRegistry`（`Record<Category, WeakMap<...>>`）へ統一。
- 1回の走査でカテゴリ別合算を行う `recomputeMetrics()` を導入。
- レポート文字列生成は `MemoryReportFormatter` に切り離し。

期待効果:
- カテゴリ追加時の実装負荷と抜け漏れを削減。
- 測定処理の時間特性を安定化。

---

### P2: Exporter系のテンプレート/文字列構築責務を整理

対象: `src/exporters/pug-exporter.ts`, `src/exporters/base-component-renderer.ts`

観点:
- 出力フォーマット固有処理と共通構造（属性組み立て・ネスト処理）がファイル間で分散。
- 文字列連結ベースの組み立てロジックが多く、仕様変更時に差分追跡が難しい。

提案:
- `ExporterAst`（中間表現）を軽量導入し、Rendererごとの差異を最終段に限定。
- 共通の `AttributeSerializer` / `IndentWriter` を抽出。

期待効果:
- 新フォーマット追加時の重複を減らし、回帰テスト観点を統一可能。

## 4) 推奨実行順

1. `ThemeManager` 分離（P1）
2. `WebViewMessageHandler` ハンドラマップ化（P1）
3. `TextUIMemoryTracker` 統一化（P2）
4. Exporter共通化（P2）

## 5) 進め方（小さく安全に）

- 1テーマ1PRで分割（例: `ThemeLoader` 抽出のみ → CSS Builder抽出）。
- 各PRで「公開API非変更」を原則とし、回帰テストを先に追加。
- 最後に `ThemeManager` / `WebViewMessageHandler` のファサード側を薄くする。
