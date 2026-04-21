# Exporter境界ガイド

このガイドは、Exporter 層（出力形式ごとの責務）を把握するための入口です。

## この境界の責務

- 共通 DSL からターゲット形式（HTML / React / Pug など）への変換
- provider ごとの拡張点を保ちながら出力品質を維持
- テーマ・トークン適用時の出力整合性を担保

## HtmlExporter — Primary のみ（T-20260420-001）

`src/exporters/html-exporter.ts` の HTML 出力は **Primary（React 静的レンダー）のみ**。`ExportOptions.useReactRender === false` は **未対応**（`[HtmlExporter:FALLBACK_REMOVED]` を送出）。

### EXPORTER-FA-002 — HtmlExporter boundary（A案）

`HtmlExporter` は **React static primary path の独立 exporter** として固定する。本文生成の入口は
`renderPageComponentsToStaticHtml` のみであり、`BaseComponentRenderer`、`src/exporters/legacy/**`、`src/exporters/internal/**`
へ依存しない。

この境界は `tests/unit/html-exporter-primary-only-structure.test.js` と `eslint.config.mjs` の
`src/exporters/html-exporter.ts` 専用 `no-restricted-imports` で検出する。HTML fallback lane を戻す変更や、
HtmlExporter を文字列レンダラ基底へ再接続する変更は、Exporter final architecture の A案に反する。

### T-001 — Primary = source of truth（契約アンカー）

**Primary を source of truth（正）**とする。互換レーン（文字列レンダラ）は **削除済み**（Vault **T-20260420-001** / `t038`）。

次の 3 行は **`scripts/check-html-exporter-fallback-lane-contract.cjs`**（`npm run check:html-exporter-fallback-lane`）が **文字列として存在するか**検証する。**削除・改変する場合はスクリプトと同時に更新**すること。

T-001-ANCHOR:PRIMARY-IS-SOURCE-OF-TRUTH
T-001-ANCHOR:HTML-FALLBACK-LANE-REMOVED-T-20260420-001
T-001-ANCHOR:NO-RAW-USE-REACT-RENDER-FALSE-IN-SRC

#### 変更時の確認（レビュー / ローカル）

1. **新規コンポーネント / 新契約**: **Primary**（`renderPageComponentsToStaticHtml` / `react-static-export` 系）に追加されているかを確認する。  
2. **`src/**` の `useReactRender: false` 直書き**: **禁止**（`html-exporter-route-viability` の entry guard）。  
3. **CI 前ローカル**: `npm run check:html-exporter-fallback-lane` が PASS すること（ドキュメント・アンカー縮退防止）。

| 経路 | 条件 | 実装の要点 | 位置づけ |
|------|------|------------|----------|
| **Primary** | `ExportOptions.useReactRender` が **省略または true**（既定） | `renderPageComponentsToStaticHtml` → `buildHtmlDocument(..., { noWrap: true })`。WebView と同じ React コンポーネント＋`webviewCss` を前提とした系統。 | **唯一の export / プレビュー連携の正**。 |

- オプションの意味: `src/exporters/export-types.ts` の `useReactRender` JSDoc。

### 構造負債（runtime truth vs 型構造）— Vault **T-20260421-018**（E-HTML-PRIMARY-STRUCTURE）

- **実行経路**は上表の **Primary のみ**。**Sprint 2（`T-20260421-022` / `023`）** により `HtmlExporter` は **`Exporter` のみ実装**し、**`BaseComponentRenderer` / `legacy/html-renderers/*` 依存を除去**した（**runtime と公開型が一致**）。
- **棚卸し正本**: `docs/current/theme-export-rendering/html-exporter-primary-structure-inventory.md`。
- **`BaseComponentRenderer` 利用者**: `docs/current/theme-export-rendering/base-component-renderer-consumers.md`（**T-20260421-025**）。**HtmlExporter への legacy 再 import** は **ESLint** で検出（`eslint.config.mjs` · **T-20260421-026**）。
- **エピック完了**: Vault **T-20260421-018** Sprint 3（**T-025〜027**）で文書・CHANGELOG を最終整合（**legacy skeleton removed** 後の読み手向け記録）。
- **レビュー時の確認**: `HtmlExporter` に **legacy** を戻す PR は **ガード違反**として弾かれる。

## Export と Preview（WebView）の共有境界（T-117）

**目的**: Export の primary 経路と WebView プレビューが **同じ React 実装**を共有しうるため、「どこまでが Export 契約で、どこがプレビュー専用か」を迷わない。

| 区分 | 置き場の目安 | メモ |
|------|----------------|------|
| **共有カーネル** | `src/exporters/react-static-export.ts` が参照する **`src/renderer/component-map`** 経由の描画 | HTML exporter の **primary**（`useReactRender` 既定）とプレビューが交差しやすい。変更は **両経路の回帰**を意識する。 |
| **Export 専用** | 各 `*exporter.ts`・`legacy/html-renderers/*`（HtmlExporter 以外）・`pug/*` など **文字列生成系** | HtmlExporter の **Primary 以外**の経路は廃止（T-20260420-001）。他フォーマット exporter の責務は従来どおり。 |
| **Preview 専用** | WebView パネル・メッセージハンドラ（`src/renderer/` の UI シェル） | DSL の **表示**には関与するが、CLI export 成果物の **契約**とは切り分ける。 |

- 結合パターンの詳細: [export-webview-runtime-coupling-inventory.md](export-webview-runtime-coupling-inventory.md)
- import 境界（WebView → Export 禁止）: [import-boundaries-4-lanes.md](import-boundaries-4-lanes.md)

## 関連ドキュメント

- Exporter の `renderXxx` 抽象を **capability map** に寄せる設計案（追加コスト削減・段階移行）: [exporter-capability-map-design.md](exporter-capability-map-design.md)
- Primary / fallback 差分の棚卸し（分類表）: [html-exporter-primary-fallback-inventory.md](html-exporter-primary-fallback-inventory.md)
- **Primary-only 構造棚卸し**（継承・legacy フィールド・`export` call path）: [html-exporter-primary-structure-inventory.md](../theme-export-rendering/html-exporter-primary-structure-inventory.md)
- **`BaseComponentRenderer` 利用者（HtmlExporter 非対象）**: [base-component-renderer-consumers.md](../theme-export-rendering/base-component-renderer-consumers.md)
- fallback CSS 境界ポリシー: [export-fallback-lane-boundary-policy.md](export-fallback-lane-boundary-policy.md)
- theme token / CSS variable 契約の current state: [theme-token-vocabulary.md](theme-token-vocabulary.md)
- Provider契約: `docs/current/services-webview/PROVIDER_CONTRACT.md`
- テーマ実装: `docs/current/theme-export-rendering/THEME_IMPLEMENTATION.md`
- API/互換方針: `docs/current/workflow-onboarding/api-compat-policy.md`

## 変更時のチェックポイント

- 新規 provider 追加時に既存 provider の契約と検証導線を壊していないか
- フォーマット固有ロジックが共通層へ漏れ出していないか
- Exporter の挙動差分を README / docs に反映できているか

## HtmlExporter 変更時の注意（旧 Fallback-only 節の置換）

- **互換レーンは削除済み**（T-20260420-001）。HTML の意味契約は **Primary テスト**と `html-exporter-primary-fallback-inventory.md` を正とする。
- 記録場所: 近接コードコメント、review handoff、または PR の影響欄。

### T-350 classification rule（更新）

- **intended difference**: Primary-only routing and behavior documented in `html-exporter-primary-fallback-inventory.md`（履歴としての fallback 記述は **過去形**に更新されていく）。
- **acceptable temporary debt**: legacy `html-renderers/*` が **`ReactExporter` / `PugExporter` 等、HtmlExporter 以外**から参照される限りの依存（文字列レンダラ系の共有実装）。**HtmlExporter** は Sprint 2 以降 **基底非依存**（`base-component-renderer-consumers.md`）。
- **unresolved mismatch**: export / provider / preview preparation のいずれかで Primary と実出力が食い違う場合は **Primary を先に**修正する。
