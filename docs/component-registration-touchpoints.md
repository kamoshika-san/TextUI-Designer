# コンポーネント登録点の棚卸しと SSOT 案（T-116）

**親エピック**: Vault `T-20260321-115`（多層編集統合）。本稿は **第1子**として、built-in 相当のコンポーネントを追加・変更するときに触れうる **登録点**を列挙し、**正本候補（SSOT）**と **従属（生成・派生）**の整理案を示す。

## 登録点一覧（現状）

| 区分 | 主なファイル / モジュール | 役割 |
|------|---------------------------|------|
| **Descriptor 正本** | `src/components/definitions/component-descriptor-graph.ts`（`COMPONENT_DEFINITIONS`） | スキーマ参照・補完・MCP カタログ等の **単一グラフ**。 |
| **Built-in 名の列挙** | `src/components/definitions/built-in-components.ts`（`BUILT_IN_COMPONENTS`） | 組み込み種別名のソース。`DSL_COMPONENT_KINDS` はここから導出（T-091）。 |
| **Manifest / schema** | `package.json` contributes、`schemas/`、`COMPONENT_MANIFEST` 連携 | VS Code 拡張としての公開定義。 |
| **Preview（WebView）** | `src/renderer/component-map.tsx`（built-in の React 登録） | プレビュー描画のレジストリ。`previewRendererKey`（descriptor）と対応。 |
| **Exporter（形式別）** | `src/exporters/*`（HTML / React / Pug / Vue / Svelte 等）、`base-component-renderer.ts` | 出力ごとのハンドラ・テンプレート。`exporterRendererMethod`（descriptor）と対応。 |
| **契約・整合テスト** | `tests/unit/component-contract-consistency.test.js` 等 | 上記の **閉じ方**を強制。 |

## SSOT 案（移行の北極星）

1. **DSL / 型 / descriptor 周辺**は既存どおり **`domain/dsl-types` + `COMPONENT_DEFINITIONS`** を正とし、新規の `renderer/types` 直参照は **T-113 ガード**で増やさない。
2. **Preview と Exporter の「どの実装が対応するか」**は、descriptor 上の **`previewRendererKey` / `exporterRendererMethod`** を **インデックス**とし、実装側レジストリは **機械的に追従**できる形へ寄せる（全面 codegen は不要・T-115 非スコープ）。
3. **登録漏れの検知**は既存の **component contract** 系テストを正とし、新たな「登録表の単一由来」スライスでは **テストを先に拡張**してからデータを移す。

## 次スライス候補（子チケット用）

- **スライス A**: `component-map` の登録キー集合と `COMPONENT_DEFINITIONS` の **機械的比較**を1テストにまとめる（漏れの早期検知）。
- **スライス B**: exporter 側 dispatch テーブル（`T-20260321-051` 系）と descriptor の **rendererMethod** の差分を CI で可視化。
- **スライス C**: `docs/新コンポーネント追加_修正箇所ガイド`（Vault Archive・T-054）を、上記 SSOT 案と **リンクで接続**する追記。

## 参照

- 親チケット（Vault）: `T-20260321-115` / `2026-03-21_新コンポーネント追加_多層編集統合_エピック.md`
- [exporter-boundary-guide.md](exporter-boundary-guide.md)
- [export-webview-runtime-coupling-inventory.md](export-webview-runtime-coupling-inventory.md)
