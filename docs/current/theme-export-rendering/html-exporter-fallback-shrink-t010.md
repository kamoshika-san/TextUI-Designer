# T-010: HTML Exporter fallback lane 縮小（フェーズ 1）

**チケット**: T-010  
**前提**: T-001（`check-html-exporter-fallback-lane-contract.cjs` による契約アンカー監視）は維持する。  
**関連**: [html-exporter-primary-fallback-inventory.md](html-exporter-primary-fallback-inventory.md)（Primary / fallback の詳細一覧）

## 目的

- fallback を「監視だけ」から「**段階的に削減する**」対象へ移す **第 1 歩**として、**実態の棚卸し**と **1 エントリの Primary 統合**を行う。

## 実態計測（再現手順）

1. **集計スクリプト**（リポジトリルート）:

   ```bash
   npm run report:react-fallback-usage
   ```

   - `runtime fallback entry files`: **本番の明示的 fallback 呼び出し元**（T-010 適用後は **0 件**を期待）
   - `fallback helper definitions`: `html-export-lane-options.ts`（ヘルパ定義は維持）
   - `primary-default routes`: 既定 Primary の経路ファイル一覧
   - `fallback execution test files`: 互換レーン専用テスト

2. **ソース上の `useReactRender: false` 直書き**: `tests/unit/html-exporter-route-viability.test.js` 内の **「HtmlExporter fallback entry guard」** describe が **`src/**` では `html-export-lane-options.ts` のみ**に閉じていることを機械保証（T-016 で `html-exporter-fallback-entry-guard.test.js` から統合）。

3. **経路別の呼び出し元（手動メモ）**

   | 経路 | 実装 | HtmlExporter レーン（T-010 時点） |
   |------|------|-------------------------------------|
   | CLI `capture` | `src/cli/commands/capture-command.ts` → `capturePreviewImageFromDsl` → `prepareCaptureArtifacts` | **Primary**（`useReactRender` 未指定 → `?? true`） |
   | VS Code コマンド（プレビュー画像） | `src/services/commands/capture-preview-command.ts` | **Primary**（従来よりヘルパ未使用） |
   | 組み込み `html` プロバイダ | `src/cli/provider-registry.ts` | **Primary**（`useReactRender: true`） |
   | MCP | HtmlExporter の fallback ヘルパ直接利用は **なし**（該当ソース未検出） |
   | 単体テスト（互換レーン） | `withExplicitFallbackHtmlExport(...)` | **Fallback**（意図的） |

## fallback entrypoint 分類（T-010）

| 区分 | 対象 | 根拠 |
|------|------|------|
| **必須（残す）** | `withExplicitFallbackHtmlExport` / `EXPLICIT_FALLBACK_HTML_EXPORT_OPTIONS`（`html-export-lane-options.ts`） | テスト・将来の互換経路を **明示的**にルーティングするための API 表面 |
| **必須（残す）** | `HtmlExporter` の `useReactRender === false` 分岐本体 | 互換レーンの実装コア |
| **必須（残す）** | `buildFallbackCompatibilityStyleBlock` 等（fallback 専用 CSS） | 互換レーンの見た目差分吸収 |
| **移行可能（Primary へ寄せた）** | CLI `capture`（旧: ヘルパで fallback 固定） | `prepareCaptureArtifacts` が既に **Primary 既定**のため、二重指定は不要（T-010 で除去） |
| **廃止候補** | なし（本フェーズでは **本番の fallback 強制 0 件化**のみ。ヘルパ・テストは残置） | テスト棚卸しは **T-016**（[t016-fallback-unit-tests-inventory.md](./t016-fallback-unit-tests-inventory.md)）／helper の import 境界は **T-017**（[t017-html-export-lane-options-internal-api.md](./t017-html-export-lane-options-internal-api.md)） |

## Primary vs fallback 差分マトリクス（要約）

詳細は [html-exporter-primary-fallback-inventory.md の Difference categories](html-exporter-primary-fallback-inventory.md#difference-categories) を正とする。本表は **T-010 の意思決定用サマリ**。

| 観点 | Primary | Fallback（互換） |
|------|---------|-------------------|
| レンダラ | React 静的 HTML（`react-static-export`） | レガシー文字列レンダラ群 |
| 既定 CSS | 最小 + `webviewCss` | 互換用 `compatibilityCss` を付与しうる |
| 本番での既定 | CLI export / プレビュー準備 / **CLI capture（T-010〜）** | **本番コードパスでは不使用**（テストのみ明示利用） |
| 新機能の追加先 | **ここを正** | 原則禁止（契約アンカー参照） |

## 本スプリントで実施した「1 単位」

- **単位**: CLI `capture` の **fallback 強制の除去**（`withExplicitFallbackHtmlExport` を外し、`prepareCaptureArtifacts` の **Primary 既定**に委ねる）。
- **削除したもの**: 本番経路における **不要な二重レーン指定**（挙動は Primary に統一）。

## 検証コマンド（開発者向け）

```bash
npm run compile
npm run check:html-exporter-fallback-lane
npx mocha tests/unit/html-exporter-route-viability.test.js
```
