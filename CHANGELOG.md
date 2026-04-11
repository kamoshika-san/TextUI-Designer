# Change Log

All notable changes to the "textui-designer" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [0.8.0] - 2026-04-11

### Added
- **Navigation v2 rollout lane**: Graph-first `.tui.flow.yml` support now includes CLI route analysis, terminal-aware validation, stable transition identity, migration guidance, and representative rollout samples.
- **Navigation v2 documentation**: Added `docs/navigation-v2-guide.md`, `docs/navigation-v2-migration.md`, and `docs/RELEASE_NOTES_v0.10.0.md` to clarify adoption, compatibility, and migration-required cases.

### Changed
- **Sample validation gate**: `scripts/validate-samples.cjs` now validates representative navigation flows directly, including `flow validate`, `flow analyze`, and terminal-aware `flow route` coverage for the v2 enterprise sample.
- **Navigation sample guidance**: `sample/README.md`, `sample/12-navigation/README.md`, and `sample/13-enterprise-flow/README.md` now distinguish the baseline v1 sample from the representative Navigation v2 sample.

### Compatibility
- Existing v1-style navigation documents remain valid.
- Navigation v2 migration becomes effectively required when flows depend on explicit loop policy, stable transition identity, or terminal-aware routing.

## [0.7.6] - 2026-04-09

### Added
- **Semantic Diff エンジン基盤 (E-SD0)**: DSL の意味差分を計算するエンジンの基盤を実装。`SemanticChange` 型定義 (9バリアント)、IR 抽出、構造変化検出、マッピング、サマリー出力、信頼スコアリング、CLI エントリポイント (`textui diff-compare`) まで一式。
- **Normalization ルール (E-SD0-S2)**: `normalizeNode()` (padding/margin/gap のショートハンド展開) と `normalizeDefaults()` (省略フィールドへのデフォルト値補完) を実装。23ケースの単体テスト付き。
- **インクリメンタルレンダリング Sprint 1 完了 (E-IR-01)**: DiffEntityRef レンダーターゲットマッピング・feature flag ルーティング・フルレンダーフォールバックガード (ダウングレード理由を `lastIncrementalDowngradeReason` で露出) を実装。
- **Export Preview コマンド配線 (T-U06b)**: `textui-designer.export-preview` を command-catalog に登録し、`handleExportPreviewMessage` を `executeCommand` 経由で呼ぶよう更新。`showInformationMessage` ダイアログを削除。
- **Svelte / Vue リアクティブバインディング**: Svelte と Vue エクスポーターに reactive binding パリティを追加。
- **MCP ツールサーフェス拡張**: MCP ツールの種類とテストレーンを拡張。
- **CLI ユーザーオンボーディングガイド**: 初回利用者向けガイドを CLI に追加。
- **リアル VS Code スモークレーン**: 実際の Extension Host でプレビュー起動を検証するスモークテストレーンを追加。

### Fixed
- **VS Code スモークランナー**: `module.exports = run` → `exports.run = run` へ修正。Extension Host が `runner.run` で検証するため、直接エクスポートでは `undefined` になっていた問題。
- **ErrorHandler: エラーコンテキスト保持**: `ErrorHandler` でスタックおよびコンテキスト情報が失われる問題を修正。
- **ErrorHandler: CI テストシーム**: CI での ErrorHandler テストが不安定だった問題を修正。
- **CRO: 非同期失敗の可視性**: 非同期コールバック内のエラーがサイレントになっていた問題にロギングを追加。
- **キャプチャー: ブラウザ起動の遅延**: trusted capture override でブラウザを先行起動していた問題を修正し起動を遅延させた。

### Changed
- **メトリクスゲート**: メトリクスゲートをデフォルト有効に昇格。メモリトラッキングもデフォルト ON に変更。
- **インクリメンタルレンダリング境界ターゲット**: レンダー境界ターゲットをより厳密なスコープに絞り込み。
- **README**: コントリビューター向けからユーザー向けプロダクトドキュメントへ全面改訂。DSL サンプル・コンポーネント一覧・テーマ・エクスポート形式・クイックスタートを先頭に配置。

### Maintenance
- `basic-ftp` を 5.2.0 → 5.2.1 にバンプ。

## [0.7.5] - 2026-04-08

### Added
- **Overlay Diff: コンポーネント別アコーディオン**: 変更サマリーをコンポーネント単位のアコーディオンに整理。折りたたみ/展開が可能で、プロパティ変更を子行として表示。
- **Overlay Diff: 並び替え詳細行**: コンポーネントの位置が変わった場合に「並び替え: N番目 → M番目」を子行として自動表示（Password Input・Date of Birth・Primary Button 等）。
- **Overlay Diff: キャンバスハイライト**: アコーディオンのヘッダーをクリックすると対応するキャンバスコンポーネントが青いグローで光る。キーボードの ↑↓ でハイライト移動。
- **Overlay Diff: キーボード操作**: ←→ キーで透過スライダーを4段階で操作、↑↓ キーで変更サマリーのハイライトを移動。

### Changed
- **Overlay Diff: 透過スライダー**: 連続値から 0/33/67/100 の4ステップに変更し操作感を改善。

### Fixed
- **Overlay Diff: ウィンドウ移動後に Loading... で止まる**: パネルタブを新規ウィンドウへドラッグすると webview が再ロードされ `webview-ready` が再送されるが、`hasSentInit` フラグにより再初期化がブロックされていた問題を修正。
- **Overlay Diff: groupKey 衝突**: 追加コンポーネント(Phone Number)と既存コンポーネント(Password)が同じ componentIndex を持つ場合にアコーディオンが誤ってマージされていた問題を修正。eventId をグループキーに使用するよう変更。
- **Overlay Diff: プロパティ専用コンポーネントが「ページ」グループに入る**: コンポーネントレベルのイベントが抑制されている場合にプロパティ行が誤って「ページ」グループへ分類されていた問題を修正。プレースホルダーグループを動的生成するよう変更。
- **Overlay Diff: 正規化インデックスずれによる誤ハイライト**: `stage1-sort-children-by-type-index` が diff 正規化時にコンポーネントをアルファベット順に並び替えるため、元の DSL インデックスとズレてキャンバスの誤要素がハイライトされていた問題を修正。このルールを Overlay Diff 計算から除外。
- **Overlay Diff: DatePicker の位置変更が未検出・ハイライト不動作**: `required` プロパティが ver1 に存在しないため diff イベントに `previousSourceRef=null` となり `componentIndexA` が未設定になる問題を修正。`SemanticSummaryResult` に `componentPairings` を追加し、プレースホルダーグループ生成時に欠落インデックスを補完。

## [0.7.4] - 2026-04-05

### Added
- **Overlay Diff Viewer**: New visual comparison feature for DSL files with transparent overlay and slider controls. Supports side-by-side comparison of two TextUI DSL files with opacity control for visual diff analysis.
- **Visual Diff System (Epic F)**: Complete visual diff infrastructure including view models, presentation rules, navigation contracts, and performance budgets. Includes diff display modes, change-kind rules, and fixture inventory for regression testing.
- **Conflict Detection (Epic I)**: Advanced conflict detection system for DSL components with taxonomy classification, evidence payloads, and WebView integration. Detects same-index conflicts, both-added conflicts, and mixed conflicts with visual indicators.
- **Diff Engine Enhancements (Epic M)**: Heuristic guardrails implementation with trace scoring, reviewer attention rules, and diff matrix delta baseline. Includes policy wiring through engine API and comprehensive scoring breakdown.
- **Diff Normalization Foundation (Epic K)**: Stage 0-3 normalization pipeline with traceability generation, evidence chains, and degraded path handling. Includes NormalizationTrace schema, invariant tests, and public API integration.
- **Cursor-to-Component Mapping**: Interactive component highlighting with hover affordances, jump-to-DSL functionality, and accessibility support. Includes onboarding banners, help commands, and success feedback.
- **Preview Update Indicators**: Real-time feedback system for long-running preview updates with themed indicators, completion feedback, and loading states.
- **Export Preview Flow**: Direct code generation from preview with OutputChannel display, export-confirm dialogs, and file write bypass options.
- **Modal Component Exporter Parity**: Complete React and Pug exporter support for Modal components with full feature parity including open/close states, titles, bodies, and action buttons.
- **Framework Exporter Extensions**: Svelte and Vue exporter normalization with incremental diff routing, compatibility checks, and release quality gates.
- **CLI Coverage Gates**: Comprehensive CLI testing harness with coverage for apply commands, batch path resolution, and runtime type guards.
- **CSS SSoT Improvements**: Canonical inline utility classes, VSCode variable fallbacks, and metrics-driven optimization reducing CSS drift.

### Changed
- **Export Architecture Renovation**: Complete overhaul of exporters and core component builders with standardized logging, invariant tests, and alignment confirmation.
- **CI Pipeline Enhancement**: Integrated c8 coverage, external artifact pipelines, gate configuration runtime, and evidence link assertions.
- **WebView Panel UX**: Removed Preview button, added highlight-component handlers, and improved error state preservation.
- **Merge Policy Framework**: Auto-merge safe policies, manual review guards, and three-way diff IR contracts.
- **Performance Optimizations**: Preview indicator gating, memory buffer limits (10MB), and path traversal guards in CLI runner.

### Fixed
- **Overlay Diff**: Fixed infinite loop in overlay-diff-init message exchange and browser compatibility issues with path.basename usage in OverlayDiffViewer component.
- **Visual Diff Badge**: Fixed disappearing badges on duplicate save events and improved conflict state management.
- **HTML Export**: Fixed horizontal overflow clipping and updated regression hashes for CSS SSoT changes.
- **CI Pipeline**: Fixed hash regressions, missing test files, and pipeline errors with proper artifact commits.
- **ESLint Warnings**: Fixed naming convention warnings and curly brace lint issues in conflict detector.
- **WebView Assets**: Removed stale assets and ensured proper build artifact inclusion.

## [0.7.3] - 2026-03-31

### Added
- **Modal/Dialog component**: New built-in component with preview renderer and HTML exporter. Supports `title`, `body`, `open`, and `actions` (kind: `primary` / `secondary` / `danger` / `ghost`). Closed modals (`open: false`) render as a placeholder in preview and are omitted from HTML export.
- **sample/09-modal**: New sample demonstrating delete-confirm, user-detail, and save-confirm Modal variants plus the `open: false` hidden-state pattern.
- **Diff normalization foundation (Epic K)**: Stage 0 intake validation and Stage 1 structural canonicalization for the `normalize()` API. Includes `NormalizationTrace` evidence chain (`entityPathMap` / `explicitnessMap` / `ownershipMap`), 16 unit tests, and an acceptance-matrix fixture seed (20 fixtures across 5 rule families: identity, reorder, rename, similarity, normalization).

### Fixed
- HTML export: `max-width: 100%; overflow-x: hidden` constraint added to `html` and `body` to prevent viewport overflow on narrow screens.
- **Modal exporter parity**: React and Pug now follow the same shipped Modal contract as HTML for `open`, optional `title` / `body` / `actions`, and `action.kind` fallback behavior. Maintainers should expect generated React/Pug Modal output to change from earlier placeholder / TODO states to real dialog markup.

### Changed
- **Modal release guard**: `sample/09-modal` is now covered by focused React/Pug marker-based regression tests in addition to the existing HTML path. Automated coverage now lives on the existing `test:unit` / `test:all:ci` rails, while any remaining manual smoke is limited to interactive preview/export UX.

## [0.7.2] - 2026-03-28

### Fixed
- Tabs export colors and borders now align more closely with the preview output.
- Divider and Tabs export style contracts were tightened to reduce drift in generated output.
- Transitive dependency overrides were refreshed to address the `serialize-javascript` advisory.

### Added
- Diff IR design references were added for vocabulary, identity, extraction, reorder / move, rename / remove-add, similarity matching, and extension points.

## [0.7.1] - 2026-03-28

### Fixed
- Preview theme reset now follows DSL switches correctly, so changing files no longer leaves the preview in a stale theme state.
- Export style contracts for `Accordion`, `Tabs`, `Table`, `TreeView`, `Form`, and `Alert` were aligned to reduce drift between preview and export output.
- WebView CSS fallback resolution and startup inline-style handling were tightened to reduce styling inconsistencies in the primary render lane.

### Changed
- CSS SSoT release gates were expanded with dedicated metrics, contributor guidance, regression checks, and CI verification.
- React / export parity and fallback-lane documentation were consolidated, and the public fallback export lane was deprecated in favor of the primary path.
- Project entry and workflow documentation were refreshed, including canonical setup, testing, contributing, and release references.

## [0.7.0] - 2026-03-22

### 新機能
- **テーマ切替の高速化**: CSS-only fast path と非同期テーマ読み込みを導入し、テーマ変更時のプレビュー反映を高速化しました。
- **プレビュー更新の安定化**: update queue を latest-wins に整理し、`setLastTuiFile` / deliver / phase の観測性を強化しました。
- **SchemaManager の注入ポイント拡張**: path / cache / workspace / validator の seam を追加し、単体テストしやすい構成に改善しました。

### 変更・改善
- **DSL 型の正本整理**: `src/domain/dsl-types` を中心に型定義を再編し、`Text` / `Link` / `Breadcrumb` / `Badge` / `Image` / `Icon` / `Progress` / `Form` / `Button` / `Layout` 系の型を責務ごとに分割しました。
- **SSoT ガードの強化**: `renderer/types` 逆流防止、exporter/import guard、ComponentDef/definitions 整合、descriptor 正本化のガードを拡充しました。
- **コマンド・設定・ドキュメント整備**: `contributes.configuration` / command manifest / 各種 boundary guide / maintainer guide / quality gate 文書を更新し、保守運用の導線を整理しました。
- **キャッシュ/観測ポリシー整理**: Export / WebView / theme resolver / diff metrics まわりの責務とログ方針を明文化しました。

### バグ修正
- **プレビュー更新競合**: 最小間隔中の再実行や `lastTuiFile` 更新順の不整合を修正し、編集連打時の取りこぼしを抑制しました。
- **WebView / Export 周辺の互換性**: Windows 形式パスの basename 正規化や、テスト環境での `vscode` 遅延取得など、環境差分による不具合を修正しました。

### テスト・CI
- **テスト基盤の安定化**: `SchemaManager` 系の require フック縮小、WebView/theme-switching 統合テスト、SSoT/contract 系テストを追加・整理しました。
- **運用ドキュメント更新**: simulated E2E、`out/` 前提、品質ゲート、API 互換ポリシー、ビルトイン追加手順を最新構成に合わせて更新しました。

## [0.6.1] - 2026-03-19

### 変更・改善
- `theme-vars` 側のセレクタ生成をコンポーネント定義に統一し、テーマ適用の一貫性を改善（T-20260319-002）

### バグ修正
- キャプチャの「全体ページにならない」再発時に追跡できるよう、full-page→フォールバック経路の観測ログを追加（T-20260319-004）

## [0.6.0] - 2026-03-17

### 新機能
- **プレビュー画像出力（PNG）**: VS Code コマンド（`TextUI: Capture Preview Image`）/ CLI / MCP から、プレビューをそのまま画像として出力できるようになりました（テーマ指定にも対応）。
- **新コンポーネント追加**: `Badge` / `Image`（avatar など）/ `Progress`（セグメント表示対応）/ `Icon` / `Link` / `Breadcrumb` を追加しました。
- **Table 強化**: 行 hover (`rowHover`) と、セル内にコンポーネントを配置できる表現を追加しました。
- **サンプル追加**: GitHub リポジトリ画面風の大規模サンプル `sample/08-github/` を追加しました（テンプレート分割の実例つき）。

### 変更・改善
- **レンダリング経路の統一**: WebView / Export / キャプチャのレンダラーを揃え、表示の一貫性を改善しました。
- **エクスポートの出力整合**: WebView のレイアウト挙動に合わせて、HTML/React/Pug の出力（wrapper や container/table 周り）を調整しました。
- **Container 表現拡張**: `flexGrow` / `minWidth` など、レイアウト指定の表現を追加・改善しました。
- **テーマ適用の改善**: プレビューで選択中のテーマが Export / キャプチャにも反映されるように改善しました（明示指定も可能）。

### CLI / MCP
- **CLI 拡張**: `providers` / `validate` / `plan` / `apply` / `state` / `capture` を中心に機能を拡充し、CI やスクリプトからの自動化を強化しました。
- **OpenAPI import 強化**: import レイヤを分割し、operation 選択やマッピングの拡張性を改善しました。
- **MCP 拡張**: `run_cli` / `capture_preview` などを通じて、生成AIエージェントから Export / キャプチャを呼び出しやすくしました（テーマ指定可）。

### バグ修正
- **キャプチャ安定性**: スクロールコンテナや viewport 外の領域を含む「全体キャプチャ」の安定性を改善しました。
- **レイアウト/整列**: Container の align 等、細部の表示崩れを修正しました。

### 開発・CI
- **CI 品質ゲート強化**: `tsc --noEmit` の strict typecheck と `eslint --max-warnings 0` を pretest に含め、CI とローカルの検査差分を減らしました。
- **依存関係**: `puppeteer-core` を導入し、`yauzl` のパッチ版を override することでセキュリティ/互換性を改善しました。

### 破壊的変更 / 注意点
- **エクスポート出力の差分**: WebView と揃えるために HTML/React/Pug の出力構造・スタイルが一部変わります。生成物をコミットしている運用の場合は差分レビューを推奨します。

## [0.5.1] - 2026-03-08

### 新機能
- **新コンポーネント対応**: `Spacer` / `TreeView` を追加し、MVP構成を超えたレイアウト・階層表示をDSLで扱えるように改善。

### 変更
- **サンプルDSL更新**: `sample/01-basic` を全対応コンポーネントを使うサンプルに更新。
- **エンタープライズサンプル更新**: `sample/07-enterprise` を実運用向け構成として更新。
- **MCPカタログ整合**: `list_components` の説明・必須/任意プロパティを実スキーマ要件に合わせて修正。
- **ドキュメント更新**: `docs/` 配下のMCP/Cursor設定ガイドと例を更新。

### リリース
- 拡張機能バージョンを `0.5.1` に更新。
- `v0.5.1` 向けの配布資材（VSIX / リリースノート）を更新。

## [0.5.0] - 2026-03-08

### 新機能
- **サンプル 07-enterprise**: 業務システム想定のダッシュボード・検索・一覧・承認フロー・レポートのサンプルを追加（`sample/07-enterprise/`）。

### 変更・改善
- **MCP サーバー起動の高速化**: `TextUICoreEngine` と `component-catalog` を初回ツール／リソース利用時まで遅延読み込みし、`initialize` の応答を短時間で返すようにしました。Cursor 等で MCP がタイムアウトしにくくなります。
- **MCP トランスポートの Cursor 互換**: クライアントが Content-Length ヘッダーなしの生 JSON で送る場合（Cursor の形式）に対応。受信はヘッダーなし JSON をそのままパースし、レスポンスもヘッダーなし＋改行で返すようにしました。
- **MCP メッセージ境界の拡張**: ヘッダーとボディの区切りとして、単一の `\r\n` または `\n` の直後に `{` / `[` がある形式も認識するようにしました（従来の `\r\n\r\n` / `\n\n` に加えて）。

### バグ修正
- **Cursor で MCP がタイムアウトする問題**: 起動時の重いモジュール読み込みを遅延したことと、Cursor のヘッダーなし JSON 送受信に対応したことで解消しました。
- **Cursor が「Content-Length: ... is not valid JSON」でエラーになる問題**: レスポンスをヘッダー付きで返していたため、Cursor が生 JSON としてパースして失敗していました。同一セッションでは受信形式に合わせてレスポンスもヘッダーなしで返すように修正しました。

### テスト・ドキュメント
- MCP トランスポートの単一 CRLF／単一 LF 区切り・ヘッダーなし JSON のユニットテストを追加しました。
- Cursor で MCP が利用できない場合の原因（タイムアウト・ヘッダー形式）と対処（ワークスペースビルドの利用・ユーザー MCP 設定の変更）をドキュメントに記載しました。

### 破壊的変更
- なし

## [0.4.0] - 2026-03-06

### 新機能
- WebView プレビューのレンダリング性能を改善し、初回表示時間を短縮しました。
- エクスポーター（HTML / React / Pug）の出力安定性を向上し、フォームレンダリングの不整合を修正しました。
- CLI: コマンドラインからエクスポートを実行する `exporter-runner` を追加し、CI やスクリプトから HTML / React / Pug 出力が可能になりました。

### 変更・改善
- テーマ検出ロジックを強化し、大規模ワークスペースでの誤検出を低減しました。
- YAML の `!include` 解決における循環参照検出と診断メッセージを改善しました。
- 開発ビルドスクリプトを整理し、`npm run build-webview` 等の再現性を向上させました。

### バグ修正
- 複数ファイル編集時にプレビューが更新されない問題を修正しました。
- 一部環境での `HtmlExporter` による CSS パス解決の不具合を修正しました。

### テスト・ドキュメント
- テストスイートを更新し、ユニット／統合テストの安定性を向上しました。
- ドキュメントとサンプル (`sample/`) を最新化しました。

### 依存関係
- 開発依存の小幅アップデート（ビルドツール・テストランナーなど）。

### 破壊的変更
- なし

## [0.3.0] - 2026-03-01

### 新機能
- **テーマ継承（extends）**: テーマファイルで `extends` によりベーステーマを継承できるように。サンプル `sample/05-theme-inheritance/` を追加。
- **ネストしたテンプレート include**: YAML パーサーでネストした `!include` をサポート。
- **サンプルデータの再構成**: `sample/` を 01-basic、02-theme、03-include、04-include-cyclic、05-theme-inheritance に整理。

### 変更・改善
- **テーマ検出**: ネストしたディレクトリ内のカスタムテーマを検出。テーマ検出をアクティブな tui ディレクトリにスコープ。
- **テーマ YAML の診断**: テーマファイルにテーマ用スキーマを適用し、診断精度を向上。
- **診断のスコープ**: Markdown ファイルに対して診断が実行されないよう修正。
- **スキーマ検証**: `!include` サポートとスキーマ検証の整合を修正。
- **テーマサンプル**: スペーシングトークンをスキーマに合わせて修正。

### 拡張性・保守性
- **コマンドマニフェスト**: コマンド一覧の同期を一元化（sync-command-manifest.cjs）。インターフェース重視のサービス設計に合わせて整理。
- **コンポーネントマニフェスト**: コンポーネントマニフェストのリファクタとサービスインターフェースの統一。
- **ファイルチェック・DSL 補完**: 統一されたファイルチェックと DSL 補完による拡張性の向上。
- **拡張 API の一貫性**: 拡張性ガードレールとコマンドマニフェストの一貫性を改善。中〜高優先の一貫性・保守性の対応。

### ドキュメント
- テスト状況の記述を更新（AGENTS.md、README.md）。
- テーマ継承サンプルセットと README を追加。

## [0.2.1] - 2026-03-01

### 機能・リファクタリング
- **コンポーネントレジストリの導入**: 名前検出・プロパティ抽出を一元化。
- **BaseComponentRenderer を Map ベースのディスパッチに変更**: 各エクスポーターの `renderForm` から if-else 連鎖を排除。
- **WebView のコンポーネントレンダリングを component-map に集約**。
- **ExportManager**: `registerExporter` / `unregisterExporter` API を追加。`ExportOptions.format` を string 型に拡張。
- **StyleManager**: カスタムフォーマットスタイル登録 API を追加。
- **ConfigManager**: 設定プロバイダー差し替え機構を導入。
- **ServiceInitializer**: ファクトリー注入対応、グローバル変数除去。
- **スキーマ/型/レジストリの整合性検証スクリプト**を追加。

### 型・品質まわり
- **WebViewManager**: `@ts-ignore` を排除し型を適正化。
- **重複型定義を固有名に変更**し同名衝突を解消。
- **エクスポーター**: 全エクスポーターの `renderXxx(props: any)` を正しいコンポーネント型に修正。
- **YamlParser**: スキーマローダーをバリデーションに注入。テストのモック環境を安定化。
- **lastParsedData setter** の永続化を修正。

### テスト・CI
- **テスト安定化**: ファクトリーでのモジュール再読み込み、vscode モックのフォールバック、mocha `--exit` の付与、e2e タイムアウト延長。
- **CI**: 統合テスト前にビルドステップを追加。診断キャッシュキー修正と品質ゲート強化。統合テストのカバレッジ有効化と lint 警告ゼロを要求。
- **theme-switching 統合テスト**: ワークスペースモックの接続を修正。

### 依存関係の更新
- ajv、webpack、js-yaml、glob、vite、rollup などのビルド・開発用依存関係を更新。

## [0.1.7] - 2025-07-03

### 🧠 拡張機能専用メモリ追跡システム完全実装（Issue #48対応）
- **TextUIMemoryTracker クラス**: 包括的なメモリ使用量監視システムを新規実装
  - WeakMapとWeakRefを使用したメモリリーク防止機能
  - シングルトンパターンによる効率的なリソース管理
  - 自動クリーンアップ機能（設定可能な間隔）
  - リアルタイムメモリ使用量測定・追跡
- **カテゴリ別メモリ監視**: 各コンポーネントの詳細なメモリ使用量追跡
  - WebView関連メモリ（WebViewManager統合）
  - YAML解析キャッシュメモリ（CacheManager統合）
  - 診断システムメモリ（DiagnosticManager統合）
  - レンダリングキャッシュメモリ（Renderer統合）
  - 総メモリ使用量と最終測定時刻の記録
- **メモリ追跡コマンド**: 3つの新しいコマンドを追加
  - `textui-designer.showMemoryReport`: 詳細メモリレポート表示
  - `textui-designer.toggleMemoryTracking`: メモリ追跡の有効化/無効化切り替え
  - `textui-designer.enableMemoryTracking`: メモリ追跡の有効化
- **設定システム統合**: ConfigManagerにメモリ追跡設定を追加
  - `textui.performance.enableMemoryTracking`: メモリ追跡の有効/無効
  - `textui.performance.memoryMeasurementInterval`: 測定間隔（デフォルト5秒）
  - `textui.performance.memoryCleanupInterval`: クリーンアップ間隔（デフォルト30秒）

### 🔧 既存システムとの統合強化
- **WebViewManager統合**: メモリ使用量監視と自動クリーンアップ機能
  - WebViewインスタンスのメモリ使用量追跡
  - メモリ使用量に応じた自動キャッシュクリア
  - メモリリークの自動検出・修正
- **CacheManager統合**: YAML解析キャッシュのメモリ監視
  - キャッシュエントリのメモリ使用量測定
  - キャッシュヒット率とメモリ効率の相関分析
  - 自動キャッシュサイズ最適化
- **DiagnosticManager統合**: 診断システムのメモリ管理
  - 診断データのメモリ使用量追跡
  - 診断結果の自動クリーンアップ
  - メモリ効率的な診断処理

### 📊 メモリレポート機能
- **詳細メモリレポート**: カテゴリ別の詳細なメモリ使用量分析
  - 各コンポーネントのメモリ使用量（バイト単位）
  - 総メモリ使用量と使用率
  - 最終測定時刻と測定間隔
  - メモリ使用量の推移グラフ（Markdown形式）
- **リアルタイム監視**: 設定可能な間隔での継続的メモリ監視
  - バックグラウンドでの自動測定
  - メモリ使用量の異常検出
  - 自動アラート機能

### 🛡️ メモリリーク防止機能
- **WeakMap/WeakRef活用**: ガベージコレクション対応のメモリ管理
  - オブジェクト参照の自動クリーンアップ
  - メモリリークの自動検出・修正
  - 効率的なメモリ使用量測定
- **自動クリーンアップ**: 設定可能な間隔での自動メモリ最適化
  - 不要なオブジェクトの自動削除
  - メモリ使用量の最適化
  - パフォーマンスの維持

### 🧪 テスト品質向上
- **202テスト全て成功**: 新機能と既存機能の完全互換性確認
- **TextUIMemoryTracker単体テスト**: 包括的な機能テスト
  - メモリ測定機能の正確性検証
  - クリーンアップ機能の動作確認
  - エラーハンドリングの検証
- **CommandManager統合テスト**: メモリ追跡コマンドの動作確認
  - コマンド登録の確認（19個のコマンド）
  - メモリ追跡コマンドの動作検証
  - ファクトリパターンとの統合確認

### 🔧 技術的実装詳細
- **TypeScript ES2021対応**: WeakRef未認識エラーの解決
  - tsconfig.jsonのtargetとlibをES2021に更新
  - モダンなJavaScript機能の活用
  - 後方互換性の維持
- **パフォーマンス最適化**: 5%未満のオーバーヘッド
  - 効率的なメモリ測定アルゴリズム
  - 軽量なメトリクス収集
  - 設定可能な監視間隔
- **エラーハンドリング強化**: 堅牢なメモリ管理
  - 例外処理の完全実装
  - グレースフルデグラデーション
  - 詳細なログ出力

### 🎯 開発者体験向上
- **メモリ使用量の可視化**: 開発時のメモリ効率把握
- **自動最適化**: メモリリークの自動検出・修正
- **詳細レポート**: パフォーマンス分析の支援
- **設定可能な監視**: 開発環境に応じた柔軟な設定

## [0.1.5] - 2025-06-29

### 🔧 カスタムテーマファイルのJSONスキーマ対応完全実装
- **"No JSON Schema"問題解決**: カスタムテーマファイル編集時のスキーマ認識問題を完全修正
  - VS Code右下の"No JSON Schema"表示の完全解消
  - テーマファイルでのIntelliSense・補完機能の正常動作確認
  - ツールチップ・ホバーヘルプの完全復旧
- **包括的テーマファイルパターン対応**: package.jsonでのスキーマ設定を大幅拡張
  - `*-theme.yml`、`*-theme.yaml` パターン対応（例: `custom-theme.yml`、`dark-theme.yml`）
  - `*_theme.yml`、`*_theme.yaml` パターン対応（例: `custom_theme.yml`、`company_theme.yml`）  
  - 既存の`textui-theme.yml`、`textui-theme.yaml`パターン維持
  - 全パターンでの自動スキーマ適用・型チェック機能
- **SchemaManagerでのテーマスキーマ完全対応**: 動的スキーマ登録システムを実装
  - `loadThemeSchema()`メソッドによるテーマスキーマの自動読み込み
  - `getThemeSchemaPath()`メソッドによる正確なスキーマパス解決
  - YAML/JSON言語サービスへの動的スキーマ登録機能
  - キャッシュ機能とクリーンアップ処理の強化
  - エラーハンドリング・ログ出力の改善

### 🧪 テスト品質大幅向上
- **テスト成功率100%達成**: 193個のテスト全て成功（+2個改善、失敗0個）
- **SchemaManagerテスト完全修正**: テーマスキーマ対応テストの失敗問題を解決
  - テスト用テーマスキーマファイルの自動作成・管理
  - `beforeEach`でのスキーマパス適切設定
  - テストクリーンアップ処理の強化
  - ファイル読み込みエラーの完全対策
- **WebViewManagerテスト完全修正**: dispose関連エラーの完全解消
  - 安全なdispose処理の実装（条件分岐・エラーハンドリング）
  - モックオブジェクトの堅牢化（webview-manager-factory.js改善）
  - メモリリーク防止・参照管理の強化

### 🎯 開発者体験大幅改善
- **シームレスなテーマ開発**: スキーマ認識によるエラーフリーな編集体験
- **型安全性の完全保証**: 全テーマファイルでの自動補完・バリデーション
  - プロパティ名の自動補完（100+プロパティ対応）
  - リアルタイムエラー検出（構文・型チェック）
  - 詳細な日本語説明付きツールチップ
  - CSS変数パターンの自動提案
- **柔軟なファイル命名**: プロジェクトの命名規則に合わせた自由なテーマファイル名
- **即座のフィードバック**: スキーマ違反・構文エラーの瞬時検出

### 🔧 技術的実装詳細
- **JSON Schema Draft-07準拠**: 標準的なスキーマ検証による高い互換性
- **動的言語サービス登録**: VS Code Language Server Protocolとの完全連携
- **パフォーマンス最適化**: スキーマキャッシュ・遅延読み込みによる高速動作
- **エラー処理強化**: ファイル不存在・権限エラー等の適切な処理
- **テストカバレッジ向上**: 新機能の全シナリオをカバーする包括的テスト

## [0.1.4] - 2025-06-29

### 🎨 テーマ切り替えUI完全実装（WebView内リアルタイム切り替え）
- **完全なテーマ切り替えインターフェース**: プレビュー画面に統合されたドロップダウン式テーマセレクター
  - 🎨 直感的なテーマ選択UI（アイコン: 🎨）
  - リアルタイムテーマプレビュー（切り替え時即座反映）
  - アクティブテーマの視覚的インジケーター（✓マーク）
  - テーマ説明文の表示（description対応）
  - ローディング状態表示（⏳アニメーション）
- **自動テーマ検出システム**: ワークスペース全体からテーマファイルを自動発見
  - サンプルフォルダ（`sample/`、`textui-designer/sample/`）
  - プロジェクトルート（`textui-theme.yml`、`*-theme.yml`、`*_theme.yml`）
  - YAML メタデータ解析（`theme.name`、`theme.description`）
  - デフォルトテーマ自動追加（「デフォルト」テーマオプション）
- **WebView統合メッセージング**: 
  - `available-themes`メッセージで利用可能テーマ一覧送信
  - `theme-switch`メッセージでリアルタイムテーマ切り替え
  - `get-themes`メッセージでテーマ一覧再取得
  - postMessage双方向通信でVS Code拡張機能連携
- **UI/UX最適化**: 
  - モダンなドロップダウンデザイン（半透明・ブラー効果）
  - ホバーエフェクト・トランジションアニメーション
  - 外部クリックでの自動クローズ
  - エクスポートボタン・ThemeToggleボタンとの配置調整
  - レスポンシブ対応（12-20rem可変幅）

### 🔧 WebViewManager 拡張実装
- **テーマファイル検出アルゴリズム**: 複数ディレクトリ対応の高性能ファイル検索
- **テーマ切り替えロジック**: ThemeManager連携によるリアルタイムCSS変数適用
- **エラーハンドリング強化**: 無効テーマファイル・パス不正の適切な処理
- **パフォーマンス最適化**: 非同期処理・メモリリーク防止

### 🎯 Phase 3 完全実装達成
- **テーマ切り替えUI**: Issue #13 ロードマップの完全制覇
- **エンタープライズ対応**: プロダクション環境での本格運用可能
- **177テスト全てパス**: 新機能と既存機能の完全互換性確認

## [0.1.3] - 2025-06-29

### 🎨 カスタムテーマのIntelliSense対応大幅強化
- **包括的テーマスキーマ完全改良**: VS Codeでのテーマファイル編集体験を劇的に向上
  - 詳細な日本語説明付きプロパティ補完（100+ プロパティ）
  - 全デザイントークン完全対応（color、spacing、typography、borderRadius、shadows、transition）
  - 全10種類コンポーネント完全対応（button、input、select、checkbox、radio、divider、alert、text、container、form）
  - CSS変数パターンの自動提案（`var(--color-primary)`形式）
  - 厳密な型チェック・バリデーション（パターンマッチング、enum制約）
  - 実用的なコード例示（examples）による学習支援
- **新規デザイントークンサポート**: 
  - `color.border`（フォーカス・エラー状態のボーダーカラー）
  - `typography.fontWeight`（light、normal、medium、semibold、bold）
  - `typography.lineHeight`（tight、normal、relaxed）
  - `transition`（fast、normal、slow アニメーション設定）
- **高度なコンポーネントスタイル定義**: 
  - ホバー・フォーカス・エラー状態の個別スタイル対応
  - Flexbox・Grid レイアウトプロパティ完全サポート
  - アクセシビリティ対応（accentColor、opacity、outline）
  - CSS全プロパティ（backgroundColor、border、padding、margin、boxShadow等）

### 🔍 型安全性・開発体験向上
- **リアルタイムエラー検出**: 不正な値・構文を即座に赤波線で警告
- **インテリジェントな補完**: コンテキストに応じた適切なプロパティ・値候補を表示
- **ツールチップヘルプ**: ホバー時の詳細説明でプロパティの用途を即座確認
- **パターンマッチング**: カラーコード（#RRGGBB）、単位付き数値（px、rem、em）の形式チェック
- **CSS変数インテリジェンス**: デザイントークン参照の自動補完・検証

### 🎯 ユーザー体験改善
- **学習コスト削減**: 豊富な例示とヘルプによる直感的なテーマ作成
- **ミスの大幅削減**: 型チェックによるタイポ・構文エラーの事前防止
- **効率的な開発**: 自動補完により手作業でのプロパティ名入力が不要
- **プロフェッショナル品質**: 企業級テーマシステムの開発が可能

### 🔧 技術的実装
- **JSON Schema Draft-07 準拠**: 標準的なスキーマ定義による高い互換性
- **$ref による再利用**: `componentStyle` 定義の効率的な共通化
- **additionalProperties サポート**: 将来の拡張性を確保した柔軟な設計
- **177テスト全てパス**: 新スキーマと既存機能の完全互換性確認

## [0.1.2] - 2025-06-29

### 🚀 新機能
- **Cache Manager ヒット率計算機能**: パフォーマンス監視機能を完全実装
  - 正確なキャッシュヒット率計算（小数点以下2桁まで表示）
  - ヒット・ミスカウンターの自動記録
  - TTL期限切れもミスとして正確にカウント
  - `getDetailedStats()` メソッドによる詳細統計取得
  - `resetStats()` メソッドによる統計リセット機能
- **🎨 テーマシステム包括ドキュメント**: Issue #13 対応完了
  - README.mdにスタイルトークンベーステーマシステムの完全説明を追加
  - 実用的なサンプルテーマファイル（`sample-theme.yml`）を提供
  - テーマデモンストレーションファイル（`theme-demo.tui.yml`）を提供
  - サンプルディレクトリ専用README.mdによる詳細な使用方法ガイド

### 🎨 テーマシステム強化
- **Modern Blue Theme**: 実用的で美しいサンプルテーマ
  - デザイントークンベースの統一されたカラーパレット
  - 全10種類のコンポーネント完全対応
  - CSS変数自動生成による効率的なスタイル適用
  - ライブプレビュー対応（保存時即座反映）
- **包括的なテーマデモ**: 全コンポーネントのテーマ適用例
  - テキスト・アラート・フォーム・ボタン・レイアウト全対応
  - リアルタイムテーマ変更確認機能
  - 統合フォーム例による実践的な使用パターン
  - テーマカスタマイズガイド内蔵

### 📚 ドキュメント大幅拡充
- **テーマシステム完全ガイド**: README.mdに9セクション・3000文字以上の詳細説明
  - デザイントークンの活用方法（カラー・スペーシング・タイポグラフィ）
  - ライブテーマ更新機能の説明
  - IntelliSense・型安全性サポートの詳細
  - コンポーネントとの連携方法
  - テーマ切り替え・ベストプラクティス・パフォーマンス最適化
- **サンプルディレクトリガイド**: sample/README.md による実践的な使用方法
  - クイックスタートガイド
  - カスタマイズパターン集（企業サイト・ダークモード・アクセシビリティ）
  - トラブルシューティング
  - Tips & Tricks

### 🔧 技術的改善
- **統計管理の強化**: キャッシュアクセス時の自動カウント機能
- **メモリ効率化**: 統計データの最小限メモリ使用
- **安全な計算**: 0除算を回避する堅牢な実装
- **型安全性**: 統計インターフェースの完全型定義

### 📊 監視機能
- **リアルタイム統計**: キャッシュ使用状況の即座把握
- **パフォーマンス指標**: ヒット率によるキャッシュ効率の定量化
- **統計リセット**: 開発・テスト時の統計クリア機能

### 🧪 品質保証
- **177テスト全てパス**: 新機能と既存機能の完全互換性確認
- **統計精度検証**: 小数点計算の正確性を確認
- **テーマシステム動作確認**: サンプルファイルによる実動作テスト

### 🎯 ユーザー体験向上
- **パフォーマンス可視化**: キャッシュ効率の定量的把握
- **開発者支援機能**: 詳細統計による最適化支援
- **運用監視対応**: プロダクション環境でのパフォーマンス追跡
- **テーマシステム即座体験**: サンプルファイルによる3ステップ開始
- **リアルタイムフィードバック**: テーマ編集時の即座プレビュー更新

## [0.1.1] - 2025-06-29

### 🚀 新機能
- **Cache Manager ヒット率計算機能**: パフォーマンス監視機能を完全実装
  - 正確なキャッシュヒット率計算（小数点以下2桁まで表示）
  - ヒット・ミスカウンターの自動記録
  - TTL期限切れもミスとして正確にカウント
  - `getDetailedStats()` メソッドによる詳細統計取得
  - `resetStats()` メソッドによる統計リセット機能

### 🔧 技術的改善
- **統計管理の強化**: キャッシュアクセス時の自動カウント機能
- **メモリ効率化**: 統計データの最小限メモリ使用
- **安全な計算**: 0除算を回避する堅牢な実装
- **型安全性**: 統計インターフェースの完全型定義

### 📊 監視機能
- **リアルタイム統計**: キャッシュ使用状況の即座把握
- **パフォーマンス指標**: ヒット率によるキャッシュ効率の定量化
- **統計リセット**: 開発・テスト時の統計クリア機能

### 🧪 品質保証
- **包括的テスト**: ヒット率計算の全シナリオをカバー
- **177テスト全てパス**: 新機能と既存機能の完全互換性確認
- **統計精度検証**: 小数点計算の正確性を確認

### 🎯 ユーザー体験向上
- **パフォーマンス可視化**: キャッシュ効率の定量的把握
- **開発者支援**: デバッグ・最適化のための詳細情報提供
- **運用監視**: プロダクション環境でのキャッシュ効率監視

## [0.1.0] - 2025-06-29

### 🎉 メジャーアップデート - 安定版リリース
- **プロダクション対応**: 172個のテスト全てパス、VS Code Marketplaceリリース準備完了
- **高度な開発体験**: エラー診断・プレビュー最適化により、実用レベルの開発環境を実現

### 🚀 新機能
- **詳細エラー表示システム**: YAML構文エラー・スキーマバリデーションエラーの詳細診断機能
  - 正確な行番号・列番号の表示
  - エラー箇所の前後コードハイライト
  - 具体的な修正提案（TAB文字検出、コロン不足、インデントエラーなど）
  - よくあるYAML構文ミスの自動検出

### 📱 プレビュー体験の大幅改善
- **最適化されたレイアウト**: プレビューを右側、編集画面を左側に自動配置
- **フォーカス管理**: プレビュー表示後も編集画面がアクティブを維持
- **ファイルツリー連携**: 別ファイルを開いてもプレビューが隠れない設計
- **WebView初期化タイミング最適化**: 完全初期化後にフォーカスを戻す仕組み

### 🔧 技術的改善・安定性向上
- **拡張機能初期化エラーの修正**: `extensionRuntime` APIプロポーザル問題を解決
- **グローバル変数によるサービス連携**: `context.globalState`から安全なグローバル変数に変更
- **process.env依存の削除**: Node.js環境変数への依存を除去し、純粋なVS Code拡張として最適化
- **エラー復帰機能**: 壊れたYAMLから正常なYAMLに切り替えた際の確実な復帰機能

### 🐛 重要なバグ修正
- **コマンド実行エラー**: `command 'textui-designer.openPreview' not found`問題の根本解決
- **WebViewManager**: YAMLパースエラー時のキャッシュクリア強化
- **React WebView**: エラー状態の確実なリセット機能
- **TypeScriptコンパイル**: 不完全なコンパイルによる実行エラーを解決

### 📊 品質保証
- **172個のテスト**: 単体・統合・E2Eテスト全てパス
- **手動回帰テスト**: 主要機能の動作確認完了
- **パフォーマンステスト**: メモリ使用量・レンダリング時間の最適化確認

### 🎯 ユーザビリティ向上
- **開発者体験**: エラー診断からプレビューまで、一貫した快適な開発環境
- **学習コスト削減**: 詳細なエラーメッセージによる効率的なデバッグ
- **プロダクション対応**: 実用的なプロジェクトで使用可能な安定性

## [0.0.12-dev]
### 🔧 開発版 - リリース準備
- 拡張機能初期化エラーの修正とテスト
- プレビュー画面のフォーカス改善の実装・テスト
- 詳細エラー表示機能の最終調整

## [0.0.11]
### メモリリーク問題対応
- 診断マネージャーの改善
- 拡張機能のクリーンアップ改善
- メモリ監視の強化
- タイマー管理の改善

## [0.0.10]

### 🔄 ライブプレビュー根本改善
- **ファイル切り替え即座反映**: tui.ymlタブを切り替えた時にライブプレビューが即座に新しいファイルの内容に切り替わるように修正
- **即座更新機能**: ファイル変更時にキャッシュをクリアし、即座にプレビューを更新する機能を追加
- **強制更新システム**: `forceUpdate`パラメータによる強制更新機能で、確実なファイル切り替えを実現

### 🔧 技術的改善
- **setLastTuiFile拡張**: `updatePreview`パラメータを追加し、ファイル変更時の即座更新を制御
- **キャッシュ制御強化**: `forceUpdate`が`true`の場合はキャッシュチェックをスキップして確実に更新
- **アクティブエディタ監視**: ファイル変更の検知精度を向上し、不要な処理を削減

### 🐛 バグ修正
- **タブ切り替え問題**: tui.ymlタブを切り替えてもプレビューが更新されない根本的な問題を解決
- **キャッシュ無効化**: ファイル変更時のキャッシュ無効化処理を確実に実行
- **更新タイミング**: ファイル切り替え時の更新タイミングを最適化

### ⚡ パフォーマンス改善
- **処理効率化**: ファイルが同じ場合の不要な処理を削減
- **即座更新**: ファイル変更時の即座更新により、ユーザー体験を大幅に改善
- **ログ最適化**: デバッグ情報の出力を効率化

### 📊 デバッグ機能
- **ファイル切り替え追跡**: アクティブエディタの変更とファイル切り替えの詳細ログ
- **更新タイミング可視化**: 各更新処理の実行タイミングを明確に記録
- **キャッシュ状態監視**: キャッシュのクリアと使用状況を詳細にログ出力

## [0.0.9]

### 🔄 ライブプレビュー改善
- **ファイル切り替え対応**: tui.ymlファイルを切り替えた時にライブプレビューが正しく更新されるように修正
- **キャッシュ管理の改善**: ファイル切り替え時にキャッシュを適切にクリアし、新しいファイルの内容を確実に反映
- **アクティブエディタ監視**: エディタの切り替えを正確に検知し、プレビューの同期を改善

### 🔧 技術的改善
- **キャッシュクリア機能**: `setLastTuiFile`メソッドでファイル変更時にキャッシュを自動クリア
- **ファイル名比較**: キャッシュチェックでファイル名も考慮し、異なるファイルの場合はキャッシュを使用しない
- **ログ出力の強化**: ファイル切り替えの状況を詳細にログ出力してデバッグを容易に

### 🐛 バグ修正
- **プレビュー同期問題**: 異なるtui.ymlファイル間で切り替えた時にプレビューが更新されない問題を修正
- **キャッシュ無効化**: ファイルが変更された場合のキャッシュ無効化処理を追加

### 📊 デバッグ機能
- **ファイル切り替えログ**: アクティブエディタの変更とファイル切り替えの詳細ログ
- **キャッシュ状態の可視化**: キャッシュのクリアと使用状況をログで確認可能

## [0.0.8]

### 🚀 パフォーマンス改善
- **大量編集時の安定性向上**: コピー＆ペーストによる大量編集時のVSCodeフリーズ問題を解決
- **YAMLパース処理の最適化**: 非同期処理を改善し、UIスレッドのブロッキングを防止
- **メモリ使用量の監視**: リアルタイムメモリ監視と自動クリーンアップ機能を追加
- **デバウンス処理の強化**: より長いデバウンス時間で安定性を向上

### 🔧 技術的改善
- **キュー管理システム**: 更新処理の重複を防止し、処理順序を保証
- **ファイルサイズ制限**: 1MB以上のファイルに対する警告機能を追加
- **変更回数制限**: 1秒あたりの最大変更回数を制限し、過度な処理を防止
- **メモリ制限機能**: 100MB以上でキャッシュ自動クリア、200MB以上で警告表示

### ⚙️ 設定の最適化
- **パフォーマンス設定の調整**: より安全で安定したデフォルト値に変更
- **同時処理数の削減**: 最大同時処理数を2→1に変更して安定性を向上
- **キャッシュTTLの延長**: キャッシュ有効期限を延長してパフォーマンスを向上

### 🐛 バグ修正
- **自動プレビュー設定の不具合**: `autoPreview.enabled = false`でもプレビューが更新される問題を修正
- **メモリリークの防止**: タイマーとキューの適切なクリーンアップ処理を追加
- **エラーハンドリングの改善**: YAMLパースエラー時の適切なエラー表示

### 📊 監視機能の強化
- **パフォーマンスログ**: メモリ使用量と処理時間の詳細ログを追加
- **早期警告システム**: メモリ使用量が大きい場合の自動警告機能
- **処理状態の可視化**: 更新処理の進行状況をログで確認可能

### 🔍 デバッグ機能
- **詳細ログ出力**: 設定値の読み込みと処理フローの詳細ログ
- **メモリ使用量の可視化**: パース前後のメモリ使用量をログで確認
- **処理タイミングの追跡**: 各処理の実行タイミングを詳細に記録

### 📝 ドキュメント
- **パフォーマンス最適化ガイド**: 大量編集時の推奨設定を追加
- **トラブルシューティング**: メモリ不足時の対処法を記載

## [0.0.7]

### 🎨 新機能
- **テーマシステム**: カスタムテーマのサポートを追加
- **リアルタイムテーマ切り替え**: VSCodeテーマ変更時の自動反映
- **CSS変数システム**: テーマ変数の動的適用

### 🔧 改善
- **WebViewパフォーマンス**: レンダリング処理の最適化
- **エラーハンドリング**: より詳細なエラーメッセージ
- **設定管理**: テーマ関連設定の追加

### 🐛 修正
- **メモリリーク**: WebViewパネル閉じ時のリソースクリーンアップ
- **テーマ適用**: 初期テーマ変数の適用タイミング

## [0.0.6]

### 🚀 新機能
- **エクスポート機能**: HTML、React、Pug形式でのエクスポート
- **プレビューからのエクスポート**: WebView内からのワンクリックエクスポート
- **テンプレートシステム**: 再利用可能なコンポーネントテンプレート

### 🔧 改善
- **IntelliSense**: より豊富な補完候補
- **エラーメッセージ**: より分かりやすいエラー表示
- **パフォーマンス**: レンダリング処理の最適化

### 🐛 修正
- **スキーマ検証**: YAML構文エラーの正確な検出
- **WebView更新**: プレビューの同期問題

## [0.0.5]

### 🎯 新機能
- **自動プレビュー**: ファイル保存時の自動プレビュー更新
- **設定システム**: カスタマイズ可能な設定オプション
- **スニペット**: 20以上のテンプレートスニペット

### 🔧 改善
- **WebView管理**: より安定したプレビュー表示
- **エラーハンドリング**: 堅牢なエラー処理
- **ログ出力**: 詳細なデバッグ情報

### 🐛 修正
- **メモリ管理**: リソースの適切な解放
- **設定読み込み**: 設定値の正確な反映

## [0.0.4]

### 🎨 UI改善
- **モダンなデザイン**: Tailwind CSSを使用した美しいUI
- **レスポンシブ対応**: 様々な画面サイズに対応
- **テーマ対応**: ライト/ダークテーマの自動切り替え

### 🔧 機能強化
- **コンポーネント追加**: Alert、Checkbox、Radio、Selectコンポーネント
- **レイアウト改善**: Container、Dividerコンポーネント
- **フォーム機能**: より豊富なフォーム要素

### 🐛 修正
- **レンダリング**: コンポーネントの表示問題
- **スタイル適用**: CSS変数の適用タイミング

## [0.0.3]

### 🚀 新機能
- **WebViewプレビュー**: リアルタイムプレビュー機能
- **JSON Schema検証**: YAML構文の自動検証
- **IntelliSense**: コード補完機能

### 🔧 改善
- **パフォーマンス**: レンダリング処理の最適化
- **エラーハンドリング**: より詳細なエラー表示
- **設定管理**: 拡張機能設定の改善

### 🐛 修正
- **スキーマ読み込み**: スキーマファイルの読み込みエラー
- **WebView通信**: メッセージ送受信の問題

## [0.0.2]

### 🎯 新機能
- **基本コンポーネント**: Text、Button、Input、Formコンポーネント
- **YAML DSL**: 宣言的なUI記述言語
- **VS Code統合**: 拡張機能としての基本機能

### 🔧 改善
- **ファイル監視**: .tui.ymlファイルの自動検出
- **コマンド登録**: プレビュー表示コマンド
- **エラーハンドリング**: 基本的なエラー処理

### 🐛 修正
- **初期化**: 拡張機能の起動問題
- **ファイル処理**: YAMLファイルの読み込みエラー

## [0.0.1]

### 🎉 初回リリース
- **TextUI Designer**: マークダウンに親和性の高いYAML/JSON DSLでUIを設計
- **VS Code拡張**: 即時プレビューと型安全な編集体験
- **基本機能**: プレビュー表示、YAML解析、WebView統合
