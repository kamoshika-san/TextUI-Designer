# Exporter境界ガイド

このガイドは、Exporter 層（出力形式ごとの責務）を把握するための入口です。

## この境界の責務

- 共通 DSL からターゲット形式（HTML / React / Pug など）への変換
- provider ごとの拡張点を保ちながら出力品質を維持
- テーマ・トークン適用時の出力整合性を担保

## HtmlExporter — primary path と fallback

`src/exporters/html-exporter.ts` は HTML 出力に **2 系統**ある。修正・拡張の「正」を迷わないための整理。

| 経路 | 条件 | 実装の要点 | 位置づけ |
|------|------|------------|----------|
| **Primary** | `ExportOptions.useReactRender` が **省略または true**（既定） | `renderPageComponentsToStaticHtml` → `buildHtmlDocument(..., { noWrap: true })`。WebView と同じ React コンポーネント＋`webviewCss` を前提とした系統。 | **通常の export / プレビュー連携で直す先**。新コンポーネントの HTML 対応もこちらを優先。 |
| **Fallback** | `useReactRender === false` | `renderPageComponents`（`BaseComponentRenderer`＋`html-renderers/*` の文字列生成）。 | テスト・`capture` 等で **明示的に false** が渡る場合に使用。**primary との挙動差**がありうる。バグは primary を先に確認し、fallback 専用ならコメントで理由を残す。 |

- オプションの意味の短い説明: `src/exporters/export-types.ts` の `useReactRender` JSDoc。
- fallback の削除や primary への統一は **本ガイドのスコープ外**（別チケット）。

## Export と Preview（WebView）の共有境界（T-117）

**目的**: Export の primary 経路と WebView プレビューが **同じ React 実装**を共有しうるため、「どこまでが Export 契約で、どこがプレビュー専用か」を迷わない。

| 区分 | 置き場の目安 | メモ |
|------|----------------|------|
| **共有カーネル** | `src/exporters/react-static-export.ts` が参照する **`src/renderer/component-map`** 経由の描画 | HTML exporter の **primary**（`useReactRender` 既定）とプレビューが交差しやすい。変更は **両経路の回帰**を意識する。 |
| **Export 専用** | 各 `*exporter.ts`・`html-renderers/*`・`pug/*` など **文字列生成系** | `useReactRender === false` や非 React 形式の本体。プレビューと **挙動差**がありうる（上表の fallback 列）。 |
| **Preview 専用** | WebView パネル・メッセージハンドラ（`src/renderer/` の UI シェル） | DSL の **表示**には関与するが、CLI export 成果物の **契約**とは切り分ける。 |

- 結合パターンの詳細: [export-webview-runtime-coupling-inventory.md](export-webview-runtime-coupling-inventory.md)
- import 境界（WebView → Export 禁止）: [import-boundaries-4-lanes.md](import-boundaries-4-lanes.md)

## 関連ドキュメント

- Provider契約: `docs/PROVIDER_CONTRACT.md`
- テーマ実装: `docs/THEME_IMPLEMENTATION.md`
- API/互換方針: `docs/api-compat-policy.md`

## 変更時のチェックポイント

- 新規 provider 追加時に既存 provider の契約と検証導線を壊していないか
- フォーマット固有ロジックが共通層へ漏れ出していないか
- Exporter の挙動差分を README / docs に反映できているか
