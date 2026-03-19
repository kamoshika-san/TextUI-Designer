# メンテナーガイド（2026-03 更新）

このドキュメントは、直近の保守性改善（`T-20260319-006/007/008/009`, `T-20260320-001`）を踏まえ、現行コードベースを安全に保守するための実務ガイドです。

## クイックスタート（変更種別別）

| 変更したい内容 | 主に触る場所 | 実行コマンド（最低限） |
|---|---|---|
| 設定項目 (`contributes.configuration`) | `src/config/configuration-properties.ts` | `npm run sync:configuration` → `npm run check:configuration` |
| コマンド一覧/メニュー | `src/services/command-catalog.ts` | `npm run sync:commands` → `npm run check:commands` |
| プレビュー画像キャプチャ | `src/utils/preview-capture/*` | `npm run compile` + `npm run test:unit` |
| MCP `capture_preview` | `src/mcp/tools/capture-preview-*` と `src/mcp/server.ts` | `npm run compile` + `npx mocha ... tests/unit/mcp-server.test.js` |
| CommandManager の実行フロー | `src/services/commands/*` と `src/services/command-manager.ts` | `npm run compile` + `npx mocha ... tests/unit/command-manager.test.js` |

---

## Pull Request（PR 作成時）

- 新規 PR では `.github/PULL_REQUEST_TEMPLATE.md` に沿って記入する（**影響範囲・ロールバック・テスト分類**を必ず埋める）。
- `main` 向けマージ時は必須チェック `Test All CI` / `DSL Plan (PR)` が緑であることを確認する。

---

## 直近の設計更新（要点）

### 1) Preview Capture の責務分割
- 旧: `src/utils/preview-capture.ts` にロジック集中
- 現在: `src/utils/preview-capture/` 配下へ分割
  - `theme-resolution.ts`
  - `browser-resolution.ts`
  - `html-preparation.ts`
  - `puppeteer-capture.ts`
  - `cli-fallback.ts`
  - `shared.ts`
- `preview-capture.ts` は公開 API と経路オーケストレーション中心

### 2) CLI エントリ遅延ロード
- `src/cli/index.ts` はコマンドごとに dynamic import
- 軽量コマンドのコールドスタート負荷を削減

### 3) MCP `capture_preview` の DTO/mapper/adapter 分離
- 追加:
  - `src/mcp/tools/capture-preview-dto.ts`
  - `src/mcp/tools/capture-preview-mapper.ts`
  - `src/mcp/tools/capture-preview-cli-adapter.ts`
- `src/mcp/server.ts` は dispatch + 実行結果判定に寄せる

### 4) CommandManager の handler 委譲化
- 追加:
  - `src/services/commands/open-preview-command.ts`
  - `src/services/commands/capture-preview-command.ts`
  - `src/services/commands/export-command.ts`
- `src/services/command-manager.ts` は登録レイヤ中心

### 5) configuration の生成/検証導入
- 定義ソース: `src/config/configuration-properties.ts`
- 生成: `scripts/generate-contributes-configuration.cjs`
- 検証: `scripts/check-contributes-configuration.cjs`
- npm scripts:
  - `sync:configuration`
  - `check:configuration`

---

## 正本（Single Source of Truth）

- **設定定義**: `src/config/configuration-properties.ts`
- **コマンド定義**: `src/services/command-catalog.ts`
- **スキーマ組み立て**: `src/services/schema/*` + `scripts/generate-schemas-from-definitions.cjs`
- **WebView CSS 組み立て**: `scripts/generate-renderer-index-css.cjs` + `src/renderer/components/styles/*`

> `package.json` は生成ターゲットを含みます。  
> 直接編集ではなく `sync/check` を通して整合を取ってください。

---

## 変更手順（推奨フロー）

### 設定を追加・変更するとき
1. `src/config/configuration-properties.ts` を更新
2. `npm run sync:configuration`
3. `npm run check:configuration`
4. `npm run compile`
5. `npm run test:unit`

### コマンドを追加・変更するとき
1. `src/services/command-catalog.ts` を更新
2. `npm run sync:commands`
3. `npm run check:commands`
4. `npm run compile`
5. `npm run test:unit`

### MCP `capture_preview` を変更するとき
1. 入力変換: `capture-preview-mapper.ts`
2. CLI 引数変換: `capture-preview-cli-adapter.ts`
3. 実行・エラー整形: `src/mcp/server.ts`
4. `tests/unit/mcp-server.test.js` を必ず通す

### CommandManager を変更するとき
1. まず `src/services/commands/*` 側で処理を追加/変更
2. `command-manager.ts` は登録・委譲に留める
3. `tests/unit/command-manager.test.js` を通す

---

## 壊れやすいポイントと注意事項

- **`package.json` の generated 領域を手編集しない**
  - 設定/コマンドは `sync:*` で更新、`check:*` で検証する
- **PowerShell 実行環境**
  - `&&` や heredoc の扱いが bash と異なるため、必要ならコマンドを分ける
- **fallback 経路の契約を変えない**
  - preview capture と MCP CLI bridge は、失敗時メッセージ契約の維持が重要
- **レイヤ境界を守る**
  - 入力検証は mapper、実行引数組み立ては adapter、サーバ/マネージャは委譲中心

---

## 最低限の検証コマンド

```bash
npm run compile
npm run check:configuration
npm run check:commands
npm run test:unit
```

変更範囲が広い場合:

```bash
npm run test:all
```

---

## 回帰テストの分類タグ（`T-20260320-007`）

PR テンプレートのテスト分類（`schema` / `exporter` / `preview` / `mcp`）と揃え、`tests/regression/*.js` の `describe` / 一部 `it` 名の**先頭**に `[tag]` を付与する。

### 命名規約

- **複数タグ**は先頭から `[preview][exporter]` のように並べる（回帰の主経路はプレビュー→エクスポートのため）。
- **単一タグ**のみのブロックは `[preview]` のように最小限にする。
- **`mcp`**: 現状 `tests/regression/` には MCP 専用スイートが無い。MCP 向け回帰を追加する際は `[mcp]` を先頭に付ける。

対象ファイル: `tests/regression/export-regression-suite.js`, `tests/regression/export-from-preview.test.js`（いずれも `npm run test:regression` で実行）。

### タグと一次切り分け（目安）

| タグ | まず疑う領域 |
|------|----------------|
| `schema` | `schemas/*`, `src/services/schema/*`, 定義駆動生成 (`generate-schemas-from-definitions`) |
| `exporter` | `src/exporters/*`, `ExportManager`, 出力形式固有ロジック |
| `preview` | `src/renderer/*`, `media/*`, WebView メッセージ、`WebViewManager` |
| `mcp` | `src/mcp/*`, CLI ブリッジ、MCP ツール入力検証 |

### 失敗時の再現コマンド

```bash
npm run compile
npm run test:regression
```

---

## Branch Protection 運用（main）

- 必須チェックの最小ラインは `Test All CI` とする。
- 追加で `DSL Plan (PR)` を必須化すると、DSL差分可視化まで統制できる。
- 緊急時に一時解除する場合は、PRへ理由・影響・復旧期限を必ず記録し、解除後に再有効化する。

---

## 今後の拡張指針

- 新規リファクタは「薄いオーケストレータ + 明確な DTO/mapper/adapter/handler 分離」を基本にする
- 仕様変更ではなく構造変更のときは、公開契約（CLI/MCP/コマンド文言）を維持する
- チケットを `done` にする前に、必ず「結果」「そこに至った理由」を記録する

