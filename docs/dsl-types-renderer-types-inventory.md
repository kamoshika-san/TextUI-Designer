# `src/renderer/types.ts` 直接参照の棚卸し（2026-03）

方針の正本は [ADR 0003: DSL 型の正本と層境界](adr/0003-dsl-types-canonical-source.md)。本書は **移行計画のための一覧**と、実施済みスライスの **記録**（下記セクション）を兼ねる。

## 概要

- **正本（canonical）**: `src/domain/dsl-types.ts` に定義される共有 DSL 型（`TextUIDSL` / `ComponentDef` 等）。
- **現状（2026-03-21 Sprint4 更新）**: `src/renderer/types.ts` は **`domain/dsl-types` の再エクスポート**のみ。`src/renderer/**` 外からの `renderer/types` import は **ゼロ**（T-128/129）。
- **移行の狙い**: 共有 DSL 契約は **domain を経由**し、非 renderer からの `renderer/types` 依存を **ゼロで維持**する。

## モジュール一覧（`renderer/types` を直接 import）

非 `src/renderer/**` からの直接 import は解消済み。  
今後 `renderer/types` 参照が増えた場合は CI ガード（`tests/unit/renderer-types-non-renderer-import-guard.test.js`）で検知される。

**CI / ローカル**: `src/renderer/**` 外からの `renderer/types` import は **ゼロ必須**（T-129）。

## Sprint4 完了メモ（T-128〜T-130）

- `src/renderer/types.ts` は thin facade（`export * from '../domain/dsl-types'`）として固定。
- Core / CLI / Services / Exporter の共有 DSL 型 import を `domain/dsl-types` 起点へ統一。
- Exporter 回帰テスト `tests/unit/exporter-family-structure-regression.test.js` を追加。

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
