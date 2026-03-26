# コンポーネント登録点の棚卸し（T-115 子・T-116）

**目的**: ビルトイン相当のコンポーネントを追加・変更するときに触る **登録点**を一覧し、**正本候補（SSOT）**と **従属（生成・派生）**の境界案を共有する。実装の統合や codegen は **別チケット**（T-115 の後続子）で扱う。

## 登録点マップ（現状）

| 領域 | 主なファイル / モジュール | 役割（要約） | SSOT 候補 |
|------|----------------------------|--------------|-----------|
| 名前の列挙 | `src/components/definitions/built-in-components.ts` | `BUILT_IN_COMPONENTS`（DSL 種別の根） | **強** — 名前の集合の起点 |
| DSL 型・判別 | `src/domain/dsl-types/（公開エントリ: index.ts）` | `ComponentDef` union・型ガード・`DSL_COMPONENT_KINDS` | **強** — ADR 0003 の型正本（`renderer/types` は再エクスポート） |
| Descriptor グラフ | `src/components/definitions/component-definitions.ts` ほか | `COMPONENT_DESCRIPTIONS` / `COMPONENT_PROPERTIES` 等 | **強** — 補完・スキーマ参照の中枢 |
| Exporter レンダラキー | `src/components/definitions/exporter-renderer-definitions.ts` | `previewRendererKey` / `exporterRendererMethod` | **中** — descriptor とペアで整合必須 |
| WebView プレビュー | `src/renderer/component-map.tsx`、`src/renderer/components/*` | プレビュー用 React 登録 | **中** — 実行時登録はここ（理想は descriptor から機械導出） |
| HTML / React / Pug / Svelte / Vue 出力 | `src/exporters/**` | 各フォーマットの描画分岐 | **従属** — シグネチャは基底＋定義に追従 |
| トークンスタイル | `token-style-property-map.ts` 等 | トークン→CSS の対応 | **従属** — コンポーネント種別に依存 |
| スキーマ JSON | `schemas/*`（生成） | YAML 検証 | **生成** — 定義から `npm run compile` で更新 |
| 契約・回帰テスト | `tests/unit/*`（例: component contract、dsl-types-descriptor-sync） | 不変条件の固定 | **検証** — 正本同士の整合を保証 |

## SSOT 案（次スライス向け）

1. **`BUILT_IN_COMPONENTS` + descriptor 1 行**を「論理コンポーネント ID」の正とし、プレビュー map・exporter 分岐を **同じキー空間**に載せる（漏れをテストで検知）。
2. **`renderer/types` は `domain/dsl-types` の薄い窓口**に統一済み（T-117）。以降の import 移行は exporter / cli を Wave 単位で domain 直参照へ寄せる。
3. **プレビュー登録**と **exporter メソッド列挙**の二重手書きをやめる方向なら、**descriptor または exporter-renderer 定義からの導出**を第2子チケット以降で検討（codegen 全面はスコープ外でも **単一モジュール集約**は可）。

## 次スライス候補（T-115 分割表との対応）

- 行1「棚卸しと SSOT 案」→ **本ドキュメント**。
- 行2 以降: preview 登録の単一由来化、exporter 側整合、契約テスト／ガイド更新 — **個別チケットで 1 コミット粒度**。

## 参照

- [adding-built-in-component.md](adding-built-in-component.md) — 手順チェックリスト
- [component-add-contract.md](component-add-contract.md) — 追加時の契約（T-055）
- [change-amplification-dsl.md](change-amplification-dsl.md)
- ADR: `docs/adr/0003-dsl-types-canonical-source.md`
