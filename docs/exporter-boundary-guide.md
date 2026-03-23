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

### Fallback を compatibility lane（互換レーン）として扱う

**定義**: `useReactRender === false` の経路は、**プレビュー／CLI の既定 export と同じ React 静的経路ではない**ため、**互換・補助**のレーンとみなす。新機能・不具合修正の **正（source of truth）は Primary**。

| 観点 | 方針 |
|------|------|
| **優先度** | **P0**: Primary の欠陥・プレビューとの整合。**P1**: Primary と意図的に揃えるべき差分の整理。**P2**: Fallback 専用の差分（互換の範囲で最小修正）。 |
| **保守** | 新コンポーネントの HTML 対応は **Primary（React 静的）を先に**満たす。Fallback への追従は **必要になったときに限り**、かつ **Primary の挙動に合わせる**方向で行う。 |
| **バグの切り分け** | 再現が Primary のみ → Primary を修正。Fallback のみ → 互換レーンとして **意図した差か**を [html-exporter-primary-fallback-inventory.md](html-exporter-primary-fallback-inventory.md) の分類表で確認し、修正するなら **理由をコードコメントに残す**。 |
| **将来** | Fallback の縮小・廃止は **別チケット**（本節では方針のみ）。 |

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

- Exporter の `renderXxx` 抽象を **capability map** に寄せる設計案（追加コスト削減・段階移行）: [exporter-capability-map-design.md](exporter-capability-map-design.md)
- Primary / fallback 差分の棚卸し（分類表）: [html-exporter-primary-fallback-inventory.md](html-exporter-primary-fallback-inventory.md)
- Provider契約: `docs/PROVIDER_CONTRACT.md`
- テーマ実装: `docs/THEME_IMPLEMENTATION.md`
- API/互換方針: `docs/api-compat-policy.md`

## 変更時のチェックポイント

- 新規 provider 追加時に既存 provider の契約と検証導線を壊していないか
- フォーマット固有ロジックが共通層へ漏れ出していないか
- Exporter の挙動差分を README / docs に反映できているか
## Fallback-only change note

- `useReactRender === false` の経路だけを変更する場合は、Primary ではなく fallback を触る理由を必ず残す。
- 記録場所は 1 つでよい: 近接コードコメント、review handoff、または PR の影響欄。
- 最低限残す内容:
  - なぜ Primary 側の修正ではないのか
  - どの entry / trigger にだけ影響するのか
  - 後で Primary へ寄せる余地があるのか、当面維持なのか
- 新しい fallback entrypoint を足す変更では、`html-exporter-primary-fallback-inventory.md` の更新要否も合わせて判断する。

### T-350 classification rule

- **intended difference**: Primary-first routing, the legacy fallback render stack itself, and other behavior already documented in `html-exporter-primary-fallback-inventory.md`.
- **acceptable temporary debt**: the explicit capture fallback route and fallback-focused regression tests, because they are named, isolated, and mechanically guarded.
- **unresolved mismatch**: any drift that affects normal export, provider output, or preview preparation, or any change that would require a new raw fallback entrypoint outside the approved helper.
- When in doubt, classify the issue against Primary first. Fallback should survive only as documented compatibility debt, not as an equal default lane.
