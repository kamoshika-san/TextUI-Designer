# メンテナーガイド（2026-03 更新）

このドキュメントは、直近の保守性改善（`T-20260319-006/007/008/009`, `T-20260320-001`, `T-20260320-010`, `T-20260320-011`）を踏まえ、現行コードベースを安全に保守するための実務ガイドです。

## 境界ガイド索引

機能境界・品質ゲート・CI 運用の入口を一覧する（本文の詳細は各ページへ）。

### SSoT 正本導線（最初にここだけ押さえる）

- 設計方針の正本: `docs/adr/0003-dsl-types-canonical-source.md`
- 棚卸し・現況の正本: `docs/dsl-types-renderer-types-inventory.md`（`npm run check:dsl-types-ssot` のスナップショット節と **同一**に保つ。更新手順は同文書「棚卸し文書の更新手順」）
- 日次運用手順の正本: `docs/adding-built-in-component.md`
- DSL 型追加の最短導線: `docs/ssot-dsl-type-addition-rules.md`
- 共有 DSL 型の原則: `src/domain/dsl-types.ts` を先に更新し、`src/renderer/types.ts` は thin facade を維持する

| ドキュメント | 主な用途 |
|---|---|
| [extension-boundary-guide.md](extension-boundary-guide.md) | VS Code 拡張ホスト側の責務と境界 |
| [cli-boundary-guide.md](cli-boundary-guide.md) | CLI エントリとサブコマンドの境界 |
| [mcp-boundary-guide.md](mcp-boundary-guide.md) | MCP サーバとツールの境界 |
| [exporter-boundary-guide.md](exporter-boundary-guide.md) | 各 Exporter / provider の境界 |
| [quality-gate-green-main.md](quality-gate-green-main.md) | ローカルで緑にしてから push/PR する運用（フェーズ 0） |
| [ci-quality-gate.md](ci-quality-gate.md) | CI ジョブ・`test:all:ci`・branch protection の対応 |
| [observability-and-cache-boundary.md](observability-and-cache-boundary.md) | 公開 API と観測・キャッシュ実装の**横断**境界（内側に閉じる方針） |
| [runtime-inspection-boundary.md](runtime-inspection-boundary.md) | performance / memory inspection コマンドの service・bindings・登録境界 |
| [architecture-review-F-boundary-roadmap.md](architecture-review-F-boundary-roadmap.md) | **ロードマップ F 正本索引**（4 境界・導入候補 IF・やらないこと）。[import-boundaries-4-lanes.md](import-boundaries-4-lanes.md)（T-110）と相互リンク |
| [dsl-types-renderer-types-inventory.md](dsl-types-renderer-types-inventory.md) | `renderer/types` 直接参照の棚卸し（移行計画用） |
| [ssot-metrics-and-ci-checks.md](ssot-metrics-and-ci-checks.md) | **`metrics:collect` / `metrics:check:ssot`** の出力と CI（Code metrics ジョブ）の見え方・PM 向けチェックリスト（T-165） |
| [test-setup-policy.md](test-setup-policy.md) | `tests/setup.js` とグローバルフックへの **新規依存を増やさない** 方針（注入優先） |
| [package-contributes-policy.md](package-contributes-policy.md) | `package.json` の `contributes` 肥大を抑えるための **カテゴリ・生成・設定の分離**（方針のみ） |

ログの混在整理（Phase 0）: [console-logger-inventory-phase0.md](console-logger-inventory-phase0.md)

チーム運用（外部アーキ 4 則）: [external-arch-team-rules.md](external-arch-team-rules.md)

## 互換レイヤ（`src/renderer/types.ts`）

共有 DSL 型まわりの **互換窓口**として `src/renderer/types.ts` をどう扱うかの最小ガイド（正本は [ADR 0003](adr/0003-dsl-types-canonical-source.md)・補遺 T-168）。

### 役割

- **正本（canonical）** は **`src/domain/dsl-types.ts`**。`renderer/types.ts` は **thin facade**（`domain` の再エクスポートに限定）として維持する。
- **非 `src/renderer/**` から `renderer/types` を import しない**（0 件を CI ガードで維持）。詳細は [dsl-types-renderer-types-inventory.md](dsl-types-renderer-types-inventory.md) と `npm run check:dsl-types-ssot`。

### WebView 入口（T-167）

- プレビュー UI の **エントリ**（例: `webview.tsx`）では、`renderer/types` を経由せず **`domain/dsl-types` を直接 import してもよい**（ビルド・ルール上問題にならない）。PoCと判断材料: [ssot-webview-dsl-types-direct-import-poc.md](ssot-webview-dsl-types-direct-import-poc.md)。
- 既存ファイルが facade 経由のままでもよい。**新規だけ**方針を変える必要はない（二重正本を増やさないこと）。

### 削除や「中身の追加」

- **型本体・独自 alias・業務ロジックを `renderer/types.ts` に足さない**（縮退ルール）。
- **ファイル削除**は、ADR 0003 の「将来削除の判定条件」を満たしたうえで **別チケット**で行う（合意なしの削除 PR はしない）。

### 変更時のチェック

- 共有 DSL 型に触れる PR では、少なくとも `npm run compile` と `npm run check:dsl-types-ssot`、関連ユニット（`renderer-types-non-renderer-import-guard` 等）を通す。

ADR: [0001 解析パイプライン（初稿）](adr/0001-document-analysis-service.md) · [0002 YAML 構文パース共有カーネル（T-067 第1スライス）](adr/0002-dsl-yaml-parse-shared-kernel.md) · [0003 DSL 型の正本と層境界（T-073）](adr/0003-dsl-types-canonical-source.md) · [0004 コンポーネント定義グラフの設計正本（T-090）](adr/0004-component-definition-graph-canonical.md) · [0006 tokenStyleProperty / defaultTokenSlot 互換](adr/0006-token-style-property-and-default-token-slot-compatibility.md)

テーマ slot 命名（Phase 6 拡張時）: [token-slot-naming-convention.md](token-slot-naming-convention.md) · モデル案: [token-slot-model-and-theme-extension.md](token-slot-model-and-theme-extension.md)

## クイックスタート（変更種別別）

| 変更したい内容 | 主に触る場所 | 実行コマンド（最低限） |
|---|---|---|
| 設定項目 (`contributes.configuration` の title + properties) | 既定値・型: `src/utils/config-schema.ts`（`SETTINGS_DEFAULTS`）／生成: `src/config/configuration-properties.ts`（`getGeneratedContributesConfiguration`） | `npm run sync:configuration` → `npm run check:configuration` |
| コマンド一覧/メニュー | `src/services/command-catalog.ts`（[詳細](contributes-commands.md)） | `npm run sync:commands` → `npm run check:commands` |
| `contributes` 整合性（snippets / yaml.schemas / menus参照） | `package.json` + `scripts/check-contributes-integrity.cjs` | `npm run check:contributes` |
| プレビュー画像キャプチャ | `src/utils/preview-capture/*` | `npm run compile` + `npm run test:unit` |
| Export の観測と本流の境界（diff メトリクス等） | `src/exporters/export-pipeline.ts`／観測スイッチ: `src/exporters/export-instrumentation.ts`／説明: [export-instrumentation.md](export-instrumentation.md) | `npm run compile` + `npx mocha ... tests/unit/export-instrumentation.test.js` |
| キャッシュ（同名クラス注意） | **Exporter 用**: `src/utils/cache-manager.ts` の `CacheManager`（レンダリング結果キャッシュ）／**WebView プレビュー用**: `src/services/webview/cache-manager.ts` の `WebViewPreviewCacheManager`（YAML・解析結果）。import を取り違えないこと。 | `npm run compile` + 関連ユニットテスト |
| MCP `capture_preview` | `src/mcp/tools/capture-preview-*` と `src/mcp/server.ts` | `npm run compile` + `npx mocha ... tests/unit/mcp-server.test.js` |
| CommandManager の実行フロー | `src/services/commands/*` と `src/services/command-manager.ts` | `npm run compile` + `npx mocha ... tests/unit/command-manager.test.js` |
| runtime inspection コマンド境界 | `src/services/runtime-inspection-service.ts` + `runtime-inspection-command-bindings.ts` + `runtime-inspection-command-entries.ts`（設計メモ: [runtime-inspection-boundary.md](runtime-inspection-boundary.md)） | `npm run compile` + `npx mocha ... tests/unit/command-feature-registries.test.js` |
| スキーマ登録・テンプレ生成（VS Code 設定連携） | `src/services/schema-manager.ts` + `src/services/schema/schema-template-generator.ts` + `src/services/schema/schema-workspace-registrar.ts` | `npm run compile` + `npx mocha ... tests/unit/schema-manager.test.js` |
| JSON Schema の component.oneOf / descriptor 整合 | 列挙の正: `src/services/schema/schema-descriptor-selectors.ts`／registry は互換: `src/registry/component-manifest.ts`（**新規は正本へ。運用** [registry-compat-layer-policy.md](registry-compat-layer-policy.md)） | `npm run compile` + `npx mocha ... tests/unit/schema-descriptor-consistency.test.js` + `npx mocha ... tests/unit/registry-compat-import-guard.test.js` |
| React エクスポートのページ/フォーム断片 | `src/exporters/react-exporter.ts` + `react-export-page-template.ts` + `react-form-control-templates.ts`（既存 `react-basic-renderer` / `react-template-renderer` と併用） | `npm run compile` + `npx mocha ... tests/unit/react-exporter-template.test.js` ほか |
| **HtmlExporter（HTML 出力の primary / fallback）** | **Primary（既定）**: `useReactRender !== false` → `react-static-export`。**Fallback**: `useReactRender === false` → `BaseComponentRenderer` 文字列系。詳細は [exporter-boundary-guide.md](exporter-boundary-guide.md)「HtmlExporter」・差分棚卸し [html-exporter-primary-fallback-inventory.md](html-exporter-primary-fallback-inventory.md) | `npm run compile` + 既存 exporter 系ユニット |
| **テーマ token → CSS（プレビューとエクスポートの対応）** | **正本（kebab）**: `src/components/definitions/exporter-renderer-definitions.ts` の `tokenStyleProperty` → 集約マップ `src/components/definitions/token-style-property-map.ts`。**エクスポート**: `src/exporters/base-component-renderer.ts`（`getTokenStylePropertyKebab`）。**WebView プレビュー**: `src/renderer/token-inline-style-from-definition.ts` の `tokenToPreviewInlineStyle`（各 `src/renderer/components/*.tsx`）。`Spacer` は寸法フォールバックとして token を別用途で使うためマップと完全一致ではない。 | `npm run compile` + `npx mocha ... tests/unit/token-style-property-map.test.js` |
| TextUI core engine 責務分割 | `src/core/textui-core-engine.ts` + `src/core/textui-core-engine-io.ts` + `src/core/textui-core-engine-domain.ts` + `src/core/textui-core-engine-format.ts` | `npm run compile` + `npx mocha ... tests/unit/textui-core-engine.test.js` |
| DSL ドメイン型（ComponentDef / TextUIDSL） | **正本**: `src/domain/dsl-types.ts`。**built-in 名の列挙**は `src/components/definitions/built-in-components.ts` の **`BUILT_IN_COMPONENTS` のみ**更新すればよい（`DSL_COMPONENT_KINDS` はそこから導出・T-091）。共有 DSL 型の import は **`domain/dsl-types` を優先**。`src/renderer/types.ts` は **thin facade 専用**で、**非 `src/renderer/**` からの import は禁止（ゼロ必須）**。ガード: `tests/unit/renderer-types-non-renderer-import-guard.test.js`（T-129）。**境界ロードマップ（レビュー F）**: [architecture-review-F-boundary-roadmap.md](architecture-review-F-boundary-roadmap.md) | `npm run compile` + `npx mocha ... tests/unit/dsl-types-descriptor-sync.test.js` + `npx mocha ... tests/unit/component-contract-consistency.test.js` + `npx mocha ... tests/unit/renderer-types-non-renderer-import-guard.test.js`（[change amplification メモ](change-amplification-dsl.md)・T-103） |
| サービス初期化順・cleanup（宣言フェーズ） | `src/services/service-runtime-phases.ts` + `src/services/service-initializer.ts`（意図の短い説明: [service-design-service-initializer.md](service-design-service-initializer.md)） | `npm run compile` + `npx mocha ... tests/unit/service-initializer.test.js` + `extensibility-service-factories-contract.test.js`（詳細は `docs/service-registration.md`） |
| FileWatcher / SchemaManager / WebView（プレビュー）の設計意図 | [service-design-file-watcher.md](service-design-file-watcher.md) · [service-design-schema-manager.md](service-design-schema-manager.md) · [service-design-webview-manager.md](service-design-webview-manager.md) | タイミング・キュー・スキーマ TTL 変更時は各メモの「不変条件」「罠」を確認 |
| 拡張 activate/deactivate の順序 | `src/services/extension-lifecycle-phases.ts` + `src/services/extension-lifecycle-manager.ts` | `npm run compile` + `npx mocha ... tests/unit/extension-lifecycle-phases.test.js`（全体は `docs/service-registration.md`） |

---

## Pull Request（PR 作成時）

- 新規 PR では `.github/PULL_REQUEST_TEMPLATE.md` に沿って記入する（**影響範囲・ロールバック・テスト分類**を必ず埋める）。
- `main` 向けマージ時は必須チェック `Test All CI` / `DSL Plan (PR)` が緑であることを確認する。

---

## 直近の設計更新（要点）

### サービス設計メモ（理解コスト低減）

主要サービスの意図・契約・罠を短くまとめたページ（実装変更なしのドキュメント）。

- [FileWatcher](service-design-file-watcher.md)（監視・デバウンス境界）
- [SchemaManager](service-design-schema-manager.md)（スキーマ登録・キャッシュ）
- [WebViewManager / プレビュー](service-design-webview-manager.md)（ファサードとライフサイクル）

### 補完（IntelliSense）と JSON Schema

- **補完候補の内容**は `COMPONENT_DEFINITIONS` / `COMPONENT_PROPERTIES`（`completion-component-catalog` 経由の descriptor グラフ）が正本。実装クラスは **`DescriptorCompletionEngine`**（旧名 `SchemaCompletionEngine` は互換エイリアス）。**JSON Schema を読んで候補を組み立てる実装ではない**。
- **JSON Schema**（`SchemaManager.loadSchema` 等）は、診断・バリデーション・`yaml.schemas` 登録など**別系統**で利用する。`CompletionCache` は **補完結果（`CompletionItem[]`）の TTL キャッシュのみ**を保持し、補完のたびにスキーマをウォームロードしない。

### 1) Preview Capture の責務分割
- 旧: `src/utils/preview-capture.ts` にロジック集中
- 現在: `src/utils/preview-capture/` 配下へ分割
  - `theme-resolution.ts`
  - `browser-resolution.ts`
  - `html-preparation.ts`
  - `puppeteer-capture.ts`
  - `cli-fallback.ts`
  - `shared.ts`
- `preview-capture.ts` は公開 API と経路オーケストレーション中心

### HTML exporter: Primary default path quick check
- 既定の HTML export provider は `src/cli/provider-registry.ts` で `useReactRender: true` を明示し、Primary path を使う。
- preview capture 側の HTML 準備は `src/utils/preview-capture/html-preparation.ts` で `options.useReactRender ?? true` を使い、未指定時は Primary path を選ぶ。
- 明示的な CLI fallback は `src/cli/commands/capture-command.ts` から `src/exporters/html-export-lane-options.ts` の helper を通して選ぶ。
- built-in / exporter の差分切り分けでは、この 3 入口を先に確認してから renderer 実装や fallback 側を追う。

### 2) CLI エントリ遅延ロード
- `src/cli/index.ts` はコマンドごとに dynamic import
- 軽量コマンドのコールドスタート負荷を削減
- サブコマンド追加は `src/cli/command-registry.ts` に 1 エントリ追加（CLI 文言/exit code 契約を維持）

### 3) MCP `capture_preview` の DTO/mapper/adapter 分離
- 追加:
  - `src/mcp/tools/capture-preview-dto.ts`
  - `src/mcp/tools/capture-preview-mapper.ts`
  - `src/mcp/tools/capture-preview-cli-adapter.ts`
- `src/mcp/server.ts` は dispatch + 実行結果判定に寄せる

### 4) CommandManager の handler 委譲化
- 追加:
  - `src/services/commands/open-preview-command.ts`
  - `src/services/commands/capture-preview-command.ts`
  - `src/services/commands/export-command.ts`
- `src/services/command-manager.ts` は登録レイヤ中心

### 5) configuration の生成/検証導入（`contributes.configuration` 全体）
- 既定値・スキーマ断片: `src/utils/config-schema.ts`（`SETTINGS_DEFAULTS` / `buildConfigurationSchema`）
- カテゴリ順・公開 API: `src/config/configuration-properties.ts`（`getGeneratedContributesConfiguration` が `title` + `properties` を返す）
- 生成: `scripts/generate-contributes-configuration.cjs`（`package.json` の `contributes.configuration` を上書き）
- 検証: `scripts/check-contributes-configuration.cjs`（生成結果と `package.json` の完全一致）
- npm scripts: `sync:configuration` / `check:configuration`

### 5.1) contributes commands / menus（`T-20260321-002`）
- 正本・手順: [contributes-commands.md](contributes-commands.md)
- `sync:commands` は `contributes.commands` に加え **`contributes.menus` を `getPackageMenuContributions()` で全面置換**（従来の `menus` への手編集マージは廃止）
- `check:commands` は `menus` の**全ロケーションキー**をカタログと比較

### 6) SchemaManager の責務分割（`T-20260320-010`）
- `src/services/schema-manager.ts`: パス・キャッシュ・`load*` / `validate` のファサード（公開 API は変更しない）
- `src/services/schema/schema-template-generator.ts`: メイン `schema.json` からテンプレ用 JSON を生成
- `src/services/schema/schema-workspace-registrar.ts`: YAML/JSON 拡張向けのワークスペース設定への登録・解除

### 7) ReactExporter のテンプレート分割（`T-20260320-011`）
- `src/exporters/react-export-page-template.ts`: 既定 TSX ページシェル（`buildReactPageDocument`）
- `src/exporters/react-form-control-templates.ts`: Input/Checkbox/Radio/Select/DatePicker のマークアップ断片（`buildLabeledFieldBlock` 等は基底経由で `react-exporter.ts` 側）
- `react-exporter.ts`: トークン・属性組み立てと `renderXxx` のオーケストレーション中心

---

## 正本（Single Source of Truth）

- **設定定義**: `src/config/configuration-properties.ts`
- **コマンド定義**: `src/services/command-catalog.ts`
- **スキーマ組み立て**: `src/services/schema/*` + `scripts/generate-schemas-from-definitions.cjs`（**`definitions.component.oneOf` と `definitions/<Name>` の期待列挙**の正本は descriptor → 詳細は [schema-pipeline-from-spec.md](schema-pipeline-from-spec.md)）
- **補完の候補内容（プロパティ辞書）**: descriptor 経由の `COMPONENT_PROPERTIES`（**執筆**は現状 `manifest.ts` → [completion-descriptor-authoring.md](completion-descriptor-authoring.md)）
- **WebView CSS 組み立て**: `scripts/generate-renderer-index-css.cjs` + `src/renderer/components/styles/*`

> `package.json` は生成ターゲットを含みます。  
> 直接編集ではなく `sync/check` を通して整合を取ってください。

---

## 変更手順（推奨フロー）

### 設定を追加・変更するとき
1. `src/config/configuration-properties.ts` を更新
2. `npm run sync:configuration`
3. `npm run check:configuration`
4. `npm run compile`
5. `npm run test:unit`

### コマンドを追加・変更するとき
1. `src/services/command-catalog.ts` を更新
2. `npm run sync:commands`
3. `npm run check:commands`
4. `npm run compile`
5. `npm run test:unit`

### MCP `capture_preview` を変更するとき
1. 入力変換: `capture-preview-mapper.ts`
2. CLI 引数変換: `capture-preview-cli-adapter.ts`
3. 実行・エラー整形: `src/mcp/server.ts`
4. `tests/unit/mcp-server.test.js` を必ず通す

### CommandManager を変更するとき
1. まず `src/services/commands/*` 側で処理を追加/変更
2. `command-manager.ts` は登録・委譲に留める
3. `tests/unit/command-manager.test.js` を通す

---

## 壊れやすいポイントと注意事項

- **`package.json` の generated 領域を手編集しない**
  - 設定/コマンドは `sync:*` で更新、`check:*` で検証する
- **PowerShell 実行環境**
  - `&&` や heredoc の扱いが bash と異なるため、必要ならコマンドを分ける
- **fallback 経路の契約を変えない**
  - preview capture と MCP CLI bridge は、失敗時メッセージ契約の維持が重要
- **外部契約（公開API / 設定キー / exporter 互換）**
  - 正本: [api-compat-policy.md](api-compat-policy.md)
  - 互換レイヤを段階的に薄くするときの順序・チェックリスト: [compat-layer-shrinkage-checklist.md](compat-layer-shrinkage-checklist.md)
- **レイヤ境界を守る**
  - 入力検証は mapper、実行引数組み立ては adapter、サーバ/マネージャは委譲中心

---

## 最低限の検証コマンド

```bash
npm run compile
npm run check:dsl-types-ssot
npm run check:configuration
npm run check:commands
npm run check:contributes
npm run test:unit
```

### SSoT import-boundary 失敗時の調査観点

`npm run check:dsl-types-ssot` が失敗したら、次の順で確認する。

1. 失敗ログに出るファイルで `renderer/types` import が増えていないか。
2. shared DSL 型の参照先を `src/domain/dsl-types.ts` に寄せられるか。
3. 本当に互換経路が必要な場合は、ADR とチケットで例外理由を明記できるか。

### SSoT チェックの標準実行タイミング

- ローカル: 共有 DSL 型に触れた変更の PR 作成前に `npm run check:dsl-types-ssot` を必ず実行する。
- CI: `.github/workflows/ci.yml` の `test-all-ci` / `test` ジョブで同コマンドを常時実行し、違反を早期停止する。
- **影響半径・エピック完了の客観条件（PM/TM 向け）**: [dsl-types-change-impact-audit.md](dsl-types-change-impact-audit.md)

### ユニットテストと `compile`（`T-20260320-014`）

- **`npm run test:unit` は `compile` を自動実行しない**ため、ユニットテストが参照する `out/` が無いと失敗する（`require('../../out/...')` が多数）。
- **推奨**: 初回・クリーン後は上の表のとおり **`npm run compile` を先に実行**するか、`npm run test:quick`（`compile` + unit）や `npm test`（`pretest:ci` + unit）を使う。
- `tests/setup.js` は `out/extension.js` が無い場合に **早期終了**し、`compile` / `test:quick` を案内する（特殊用途のみ `TEXTUI_TEST_SKIP_OUT_CHECK=1` で無効化）。
- `src` から直接読むパイロット（`ts-node`）は一部テストに限定しており、**CLI のように `out/cli/index.js` を実プロセスで叩く経路は引き続き `out` 前提**。

変更範囲が広い場合:

```bash
npm run test:all
```

---

## 回帰テストの分類タグ（`T-20260320-007`）

PR テンプレートのテスト分類（`schema` / `exporter` / `preview` / `mcp`）と揃え、`tests/regression/*.js` の `describe` / 一部 `it` 名の**先頭**に `[tag]` を付与する。

### 命名規約

- **複数タグ**は先頭から `[preview][exporter]` のように並べる（回帰の主経路はプレビュー→エクスポートのため）。
- **単一タグ**のみのブロックは `[preview]` のように最小限にする。
- **`mcp`**: 現状 `tests/regression/` には MCP 専用スイートが無い。MCP 向け回帰を追加する際は `[mcp]` を先頭に付ける。

対象ファイル: `tests/regression/export-regression-suite.js`, `tests/regression/export-from-preview.test.js`（いずれも `npm run test:regression` で実行）。

### タグと一次切り分け（目安）

| タグ | まず疑う領域 |
|------|----------------|
| `schema` | `schemas/*`, `src/services/schema/*`, 定義駆動生成 (`generate-schemas-from-definitions`) |
| `exporter` | `src/exporters/*`, `ExportManager`, 出力形式固有ロジック |
| `preview` | `src/renderer/*`, `media/*`, WebView メッセージ、`WebViewManager` |
| `mcp` | `src/mcp/*`, CLI ブリッジ、MCP ツール入力検証 |

### 失敗時の再現コマンド

```bash
npm run compile
npm run test:regression
```

---

## Branch Protection 運用（main）

- 必須チェックの最小ラインは `Test All CI` とする。
- 追加で `DSL Plan (PR)` を必須化すると、DSL差分可視化まで統制できる。
- 緊急時に一時解除する場合は、PRへ理由・影響・復旧期限を必ず記録し、解除後に再有効化する。

---

## 今後の拡張指針

- 新規リファクタは「薄いオーケストレータ + 明確な DTO/mapper/adapter/handler 分離」を基本にする
- 仕様変更ではなく構造変更のときは、公開契約（CLI/MCP/コマンド文言）を維持する
- チケットを `done` にする前に、必ず「結果」「そこに至った理由」を記録する
## Fallback-only change rule

- HtmlExporter の fallback lane だけを触る変更では、Primary を source of truth として扱う前提を崩さない。
- `useReactRender === false` に依存する変更を入れるときは、次の 3 点を review handoff か近接コメントに残す。
  - なぜ Primary 側の修正では足りないのか
  - どの entry / trigger だけが対象なのか
  - 当面維持か、Primary へ寄せる前提の暫定か
- reviewer は fallback-only 変更にこの説明が無い場合、同一 ticket 内の差し戻し候補として扱ってよい。
