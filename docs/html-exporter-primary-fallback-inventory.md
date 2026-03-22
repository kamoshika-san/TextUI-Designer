# HtmlExporter: primary / fallback 差分の棚卸し（分類表）

**目的**: `ExportOptions.useReactRender` による **Primary** と **Fallback** の差を、修正時に「どちらを正とするか」迷わないよう **1 ページ**に整理する。  
**正の実装**: `src/exporters/html-exporter.ts`・`docs/exporter-boundary-guide.md`「HtmlExporter」。

## 経路の要約

| 経路 | 条件 | 生成の核 |
|------|------|----------|
| **Primary** | `useReactRender !== false`（既定） | `renderPageComponentsToStaticHtml` → `buildHtmlDocument(..., { noWrap: true })` |
| **Fallback** | `useReactRender === false` | `renderPageComponents`（`BaseComponentRenderer`＋`html-renderers/*`）→ `buildHtmlDocument`（`noWrap` なし） |

## 差分の分類表

「**意図した機能**」= アーキテクチャ上そうなるべき差。「**互換レーン**」= レガシー文字列経路として残し、新機能は primary を正とする運用（詳細は [exporter-boundary-guide.md](exporter-boundary-guide.md)「Fallback を compatibility lane として扱う」）。「**調査・個別**」= 本表では型だけ置き、発見時に追記する。

| # | 差分の内容 | Primary | Fallback | 分類 | 根拠・メモ |
|---|------------|---------|----------|------|------------|
| 1 | **HTML ドキュメントのラップ** | `buildHtmlDocument` に `noWrap: true`（断片寄りの結合） | `noWrap` 指定なし（従来の全文ラップ） | **意図した機能** | `html-exporter.ts` の分岐。構造差は仕様として許容。 |
| 2 | **マークアップ生成スタック** | React 静的経路（`react-static-export`・`component-map`） | 文字列レンダラ（`html-renderers/*`） | **意図した機能** | 二系統の役割分担。新コンポーネントは **primary 優先**（コードコメント準拠）。 |
| 3 | **コンポーネント種別の対応差** | component-map 側の対応が先行しやすい | 文字列系が未対応・遅れることがある | **互換レーン** | 不具合は **まず primary** を確認。fallback 専用なら理由コメントを残す運用。 |
| 4 | **テーマ / `webviewCss` の注入** | 両経路とも `buildHtmlDocument` に `themeStyles`・`webviewCss` を渡す | 同左 | **意図した一致** | 差の主因は本体マークアップ生成部。 |
| 5 | **CLI / テストでの利用** | `provider-registry` 等は既定で React 経路 | `capture-command` 等で `useReactRender: false` を明示 | **意図した運用** | 安定化・キャプチャ用途の明示切替。 |
| 6 | **DOM の細かな差** | — | — | **調査・個別** | 発見したら issue か本表に 1 行追記。判断は **primary を正**。 |

## 関連ドキュメント

- [exporter-boundary-guide.md](exporter-boundary-guide.md) — 境界の入口・互換レーン方針
- [export-webview-runtime-coupling-inventory.md](export-webview-runtime-coupling-inventory.md) — 結合パターンの棚卸し
- `tests/unit/shared-kernel-preview-export-parity.test.js` — primary 系の preview/export 内側マークアップ整合（Tabs 等の jump 差分は対象外）
