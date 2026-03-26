# `src/renderer/types.ts` 直接参照の棚卸し（2026-03）

方針の正本は [ADR 0003: DSL 型の正本と層境界](adr/0003-dsl-types-canonical-source.md)。本書は **移行計画のための一覧**と、実施済みスライスの **記録**（下記セクション）を兼ねる。

## 概要

- **正本（canonical）**: `src/domain/dsl-types/`（実体は当面 `dsl-types/dsl-types.ts`、公開は `index.ts`）に定義される共有 DSL 型（`TextUIDSL` / `ComponentDef` 等）。
- **現状（2026-03-26）**: `src/renderer/types.ts` は **`domain/dsl-types` の再エクスポート**のみ。`scripts/check-dsl-type-imports.cjs` では **`renderer/types` 形式の import は 0 件**（`from '...renderer/types'` / 相対で `renderer/types` を含む import の総数）。非 renderer からの `renderer/types` 依存は **ゼロ**を維持する（T-128/129）。
- **移行の狙い**: 共有 DSL 契約は **domain を経由**し、非 renderer からの `renderer/types` 依存を **ゼロで維持**する。

## `npm run check:dsl-types-ssot` スナップショット（正本・2026-03-26）

以下は **`npm run check:dsl-types-ssot`**（`scripts/check-dsl-type-imports.cjs`）の標準出力を **そのまま転記**したもの。棚卸し Markdown の「現況」は **本節と矛盾しない**ように保つ（差分が出たら [棚卸し文書の更新手順](#棚卸し文書の更新手順)）。

```
DSL type import inventory
- domain/dsl-types imports: 47
- renderer/types imports: 0

Files importing domain/dsl-types:
  - src/cli/exporter-runner.ts (1)
  - src/cli/openapi/dsl-builder.ts (1)
  - src/cli/openapi/types.ts (1)
  - src/cli/provider-registry.ts (1)
  - src/cli/theme-token-resolver.ts (1)
  - src/cli/types.ts (1)
  - src/core/textui-core-component-builder.ts (1)
  - src/core/textui-core-engine-domain.ts (1)
  - src/core/textui-core-engine-format.ts (1)
  - src/core/textui-core-engine-io.ts (1)
  - src/core/textui-core-engine.ts (1)
  - src/core/textui-core-helpers.ts (1)
  - src/domain/dsl-types/index.ts (1)
  - src/dsl/load-dsl-with-includes.ts (1)
  - src/exporters/base-component-renderer.ts (1)
  - src/exporters/export-manager.ts (1)
  - src/exporters/export-optimizing-executor.ts (1)
  - src/exporters/export-pipeline.ts (1)
  - src/exporters/export-types.ts (1)
  - src/exporters/html-exporter.ts (1)
  - src/exporters/html-renderers/html-form-renderer.ts (1)
  - src/exporters/html-renderers/html-layout-renderer.ts (1)
  - src/exporters/html-renderers/html-renderer-utils.ts (1)
  - src/exporters/html-renderers/html-textual-renderer.ts (1)
  - src/exporters/metrics/diff-manager.ts (1)
  - src/exporters/pug/pug-basic-templates.ts (1)
  - src/exporters/pug/pug-form-fragments.ts (1)
  - src/exporters/pug/pug-layout-templates.ts (1)
  - src/exporters/pug-exporter.ts (1)
  - src/exporters/react-basic-renderer.ts (1)
  - src/exporters/react-exporter.ts (1)
  - src/exporters/react-form-control-templates.ts (1)
  - src/exporters/react-static-export.ts (1)
  - src/exporters/react-template-renderer.ts (1)
  - src/exporters/svelte-exporter.ts (1)
  - src/exporters/vue-exporter.ts (1)
  - src/registry/dsl-component-codec.ts (1)
  - src/renderer/types.ts (1)
  - src/renderer/use-webview-messages.ts (1)
  - src/renderer/webview.tsx (1)
  - src/types/services.ts (1)
  - src/types/webview.ts (1)
  - src/utils/cache-manager.ts (1)
  - src/utils/preview-capture/html-preparation.ts (1)
  - src/utils/preview-capture.ts (1)
  - src/utils/style-manager.ts (1)
  - tests/unit/renderer-types-thin-facade.test.js (1)
```

### 棚卸し文書の更新手順

1. リポジトリルートで `npm run check:dsl-types-ssot` を実行する（**exit 0** であること。違反があると exit 1）。
2. 出力の **集計行**（`domain/dsl-types imports` / `renderer/types imports`）と **ファイル一覧**を、上記コードブロックを **丸ごと差し替え**る（日付見出し `（正本・YYYY-MM-DD）` も更新）。
3. 本ページの「概要」箇条書きの **件数・方針**が、新しい集計と矛盾しないか確認する。
4. 変更をコミットする。

詳細は [MAINTAINER_GUIDE.md](MAINTAINER_GUIDE.md)（SSoT 正本導線）も参照。

## モジュール一覧（`renderer/types` を直接 import）

非 `src/renderer/**` からの直接 import は解消済み。  
今後 `renderer/types` 参照が増えた場合は CI ガード（`tests/unit/renderer-types-non-renderer-import-guard.test.js`）で検知される。

**CI / ローカル**:

- `src/renderer/**` 外と `tests/**` からの `renderer/types` import は **ゼロ必須**（T-129）。
- 棚卸しと違反検知は `npm run check:dsl-types-ssot` でも確認できる。

## Sprint4 完了メモ（T-128〜T-130）

- `src/renderer/types.ts` は thin facade（`export * from '../domain/dsl-types'`）として固定。
- Core / CLI / Services / Exporter の共有 DSL 型 import を `domain/dsl-types` 起点へ統一。
- Exporter 回帰テスト `tests/unit/exporter-family-structure-regression.test.js` を追加。

## Sprint 1 実装メモ（ガードレール）

- `tests/unit/renderer-types-thin-facade.test.js`: `src/renderer/types.ts` が **re-export only** であることを固定。
- `tests/unit/renderer-types-non-renderer-import-guard.test.js`: `src/renderer/**` 外 **および `tests/**`** からの `renderer/types` import を禁止。
- `scripts/check-dsl-type-imports.cjs`: `domain/dsl-types` / `renderer/types` の import 件数と違反ファイルを一覧化する棚卸しコマンド。

## T-119（E-DSL-SSOT Sprint 1）— 移行単位マトリクス（領域 × 優先）

次の **1〜2 ファイルスライス**を選ぶための整理（`領域` / 代表ファイル / 主な import 形 / 難易度 / 置換先 / メモ）。

| 領域 | 代表ファイル（例） | 主に import する型 | 難易度 | 置換先候補 | メモ |
|------|-------------------|-------------------|--------|------------|------|
| Core 残り | `textui-core-component-builder.ts` ほか | `ComponentDef` 等 | 低〜中 | `domain/dsl-types` | engine 本体は一部済み（T-105）。builder は単独で切り出しやすい。 |
| Utils | `preview-capture.ts`, `html-preparation.ts` | `TextUIDSL` | 低 | `domain/dsl-types` | CLI/キャプチャ経路。テストのモック境界を確認。 |
| Utils | `style-manager.ts` | `TextVariant`, `ButtonKind` | 低 | `domain/dsl-types` | 型のみの import。 |
| 型（契約） | `types/webview.ts`, `types/services.ts` | `TextUIDSL` | 中 | `domain/dsl-types` | サービス境界の「顔」— 置換は PR を小さく。 |
| DSL | `load-dsl-with-includes.ts` | `TextUIDSL` | 中 | `domain/dsl-types` | include 解決の中枢。 |
| CLI | `cli/types.ts` ほか OpenAPI 配下 | `TextUIDSL` | 中 | `domain/dsl-types` | ファイル数が多いがパターンは単純。Wave 単位で batch 可。 |
| Exporter 共通 | `base-component-renderer.ts` | 多数のコンポーネント型 | 中 | `domain/dsl-types` | `ExporterRendererMethod` dispatch と同時に読むこと。 |
| Exporter 個別 | `html-exporter.ts`, `react-*.ts`, `pug/*` 等 | フォーマットごとにばらつき | 中〜高 | `domain/dsl-types` | ボリューム最大。**後半 Wave** に分割推奨。 |

**推奨次スライス（本ドキュメント時点）**: `style-manager.ts` + `preview-capture.ts`（いずれも型のみ・依存が浅い）。

## T-074（移行第1スライス）向けの優先候補

層境界が読み手に効く **横断ユーティリティ**から着手するのが安全。

1. **`src/utils/cache-manager.ts`** — レンダリング結果キャッシュと DSL 型の接点が明確。
2. **`src/exporters/metrics/diff-manager.ts`** — export パイプライン上の差分（観測／メトリクス寄りの配置。[export-diff-observation-path.md](export-diff-observation-path.md)）。

## T-086（移行第2スライス）

- **実施済み**: `src/core/textui-core-engine-domain.ts` の `TextUIDSL` import を `domain/dsl-types` に寄せた。
- **次候補（棚卸し表の Core 行より）**: 同ディレクトリの `textui-core-engine.ts` / `textui-core-engine-io.ts` など、**1〜2 ファイル単位**で順次（別チケット・PM 割当）。

## T-105（第2スライス・2026-03-21）

- **`textui-core-engine.ts`** / **`textui-core-engine-io.ts`**: `TextUIDSL` の import を **`../domain/dsl-types`** に変更（`renderer/types` への直接依存を 2 ファイル分削減）。
