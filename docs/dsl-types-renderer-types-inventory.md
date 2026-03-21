# `src/renderer/types.ts` 直接参照の棚卸し（2026-03）

方針の正本は [ADR 0003: DSL 型の正本と層境界](adr/0003-dsl-types-canonical-source.md)。本書は **移行計画のための一覧**であり、本チケットでは import 変更を行わない。

## 概要

- **正本（canonical）**: `src/domain/dsl-types.ts` に定義される共有 DSL 型（`TextUIDSL` / `ComponentDef` 等）。
- **現状**: `src/renderer/types.ts` が **同一概念の並行定義**を抱え、拡張ホスト側の多数モジュールが **`../renderer/types` または `../../renderer/types`** から型を import している。
- **移行の狙い**: 共有 DSL 契約は **domain を経由**し、`renderer/types.ts` は **re-export / 互換レイヤ**へ収束する（段階的。実装は T-074 以降）。

## モジュール一覧（`renderer/types` を直接 import）

| 領域 | ファイル |
|------|----------|
| **Core** | `src/core/textui-core-engine.ts`, `textui-core-engine-io.ts`, `textui-core-engine-format.ts`, `textui-core-engine-domain.ts`, `textui-core-helpers.ts`, `textui-core-component-builder.ts` |
| **キャッシュ / 差分** | `src/utils/cache-manager.ts`, `src/utils/diff-manager.ts` |
| **プレビュー** | `src/utils/preview-capture.ts`, `src/utils/preview-capture/html-preparation.ts` |
| **スタイル** | `src/utils/style-manager.ts` |
| **型（サービス契約）** | `src/types/webview.ts`, `src/types/services.ts` |
| **DSL 読込** | `src/dsl/load-dsl-with-includes.ts` |
| **CLI** | `src/cli/types.ts`, `src/cli/theme-token-resolver.ts`, `src/cli/provider-registry.ts`, `src/cli/exporter-runner.ts`, `src/cli/openapi/types.ts`, `src/cli/openapi/dsl-builder.ts` |
| **Exporter（ルート）** | `src/exporters/html-exporter.ts`, `base-component-renderer.ts`, `vue-exporter.ts`, `svelte-exporter.ts`, `react-exporter.ts`, `react-basic-renderer.ts`, `react-template-renderer.ts`, `react-static-export.ts`, `react-form-control-templates.ts`, `pug-exporter.ts` |
| **Exporter / pug** | `src/exporters/pug/pug-basic-templates.ts`, `pug-form-fragments.ts`, `pug-layout-templates.ts` |
| **Exporter / html-renderers** | `src/exporters/html-renderers/html-textual-renderer.ts`, `html-renderer-utils.ts`, `html-layout-renderer.ts`, `html-form-renderer.ts` |

上記はリポジトリ走査時点の一覧。新規追加時は本表を更新する。

## T-074（移行第1スライス）向けの優先候補

層境界が読み手に効く **横断ユーティリティ**から着手するのが安全。

1. **`src/utils/cache-manager.ts`** — レンダリング結果キャッシュと DSL 型の接点が明確。
2. **`src/utils/diff-manager.ts`** — 同上（export パイプライン観測と隣接）。

## T-086（移行第2スライス）

- **実施済み**: `src/core/textui-core-engine-domain.ts` の `TextUIDSL` import を `domain/dsl-types` に寄せた。
- **次候補（棚卸し表の Core 行より）**: 同ディレクトリの `textui-core-engine.ts` / `textui-core-engine-io.ts` など、**1〜2 ファイル単位**で順次（別チケット・PM 割当）。
