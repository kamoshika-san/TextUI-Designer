# AGENTS.md

## Cursor Cloud specific instructions

### プロジェクト概要

TextUI Designerは、YAML/JSONベースのDSLでUIを設計するVS Code拡張機能。単一リポジトリ（モノレポではない）。外部サービス・Docker・DB依存なし。

ローカル生成物（`generated/`、`.tmp-cli-*` など）は `.gitignore` によりリポジトリに含めない。

### import の方針（DSL 型）

- **新規コード**（特に `src/domain/`・`src/services/`・`src/components/`）は、共有の DSL 型に **`src/domain/dsl-types`**（モジュール・`index.ts` 経由）を正とする。
- **`src/renderer/types.ts`** への依存はレガシー移行中の経路。上記パスに **新規で** `renderer/types` を引かないこと（ESLint `no-restricted-imports`・T-101）。既存の exporter / core 等の移行は別チケット。

#### 組み込みコンポーネント型を追加するとき（RF1-S2-T4）

- **import は常に** `../domain/dsl-types`（または `index.ts` 解決）**のみ**。外部から `dsl-types/foo.ts` を直接引かない（SSoT ガードと入口の一貫性のため）。
- **型の定義場所**はコンポーネントの系統に合わせる:
  - テキスト・リンク・パンくず・バッジ・画像・アイコン・プログレス → `dsl-types/text-navigation-media.ts`
  - ボタン（単体）→ `dsl-types/button.ts`
  - 入力・チェック・ラジオ・セレクト・日付・フォーム → `dsl-types/form.ts`
  - 区切り・スペーサ・アラート・アコーディオン・タブ・ツリー・テーブル・コンテナ → `dsl-types/layout-compound.ts`
  - **`ComponentDef` 判別ユニオン・`PageDef`・`TextUIDSL`・型ガード・`DSL_COMPONENT_KINDS`** → `dsl-types/component-def.ts`（新しい `{ Kind: ... }` の枝をここに追加）
- 追加後は `npm run compile` と `npm test` を通し、`built-in-components.ts` / `COMPONENT_DEFINITIONS` との整合を崩さないこと（既存の union 整合テストを参照）。

### 開発コマンド

`package.json`の`scripts`セクションを参照。主要コマンド:

| コマンド | 用途 |
|---|---|
| `npm run compile` | TypeScriptコンパイル（`src/` → `out/`） |
| `npm run build-webview` | Vite でWebView（React + Tailwind）をビルド（`media/`に出力） |
| `npm run lint` | ESLint実行（警告のみ、エラーなし） |
| `npm test` | ユニットテスト（`pretest`でcompile + lint実行後、Mochaで`tests/unit/**/*.js`を実行） |
| `npm run test:all` | 全テスト（unit → integration → e2e → regression） |

#### npm scripts の責務分類（入口の目安）

- **manifest**: `sync:package-contributes`, `check:contributes`, `sync:commands`, `diff:contributes:fragments` など contributes / マニフェスト系。
- **quality**: `compile`, `lint`, `test`, `check:*`（検証・ガード・SSoT）。
- **release**: `package`, `package:vsix`, `vscode:prepublish`, `build-webview`。

詳細は [package-contributes PR レビュー](./docs/current/operations/package-contributes-pr-review.md) および [未宣言 require ガード](./docs/current/operations/undeclared-requires-guard.md) を参照。

### CLI の明示依存（T-031）

- **`chokidar`**: CLI の `textui validate --watch` がファイル監視のため **runtime の直接依存**として宣言する（`require('chokidar')` に対応）。推移依存に載せない。

### テストに関する注意点

- テストは`vscode`モジュールをモック化して実行（`tests/setup.js`）。VS Code実行環境は不要。
- **新規テスト**では `setup.js` の **グローバルフック（`Module.prototype.require` 等）への依存を増やさない**こと。方針の正本: `docs/current/testing-ci/test-setup-policy.md`。
- 現在の安定確認では`npm run test:all`（unit → integration → e2e → regression）が全件パス。
- `npm run test:e2e` は **実 VS Code E2E ではなく**、`tests/setup.js` モック下の **simulated** シナリオ（`tests/README.md` 参照）。
- `npm test`（ユニットテスト）は`pretest`で`compile + lint`を実行してからMochaを実行する。

### WebViewビルドについて

- `npm run build-webview`を実行すると`media/`ディレクトリにWebViewアセットが生成される。
- 一部のテスト（integration, e2e）で`media/`が存在しないエラーログが出るが、テスト結果には影響しない。
- WebViewのソースは`src/renderer/`にあり、Vite + React + Tailwind CSSでビルドされる。

### エクスポート機能のテスト

VS Code環境がなくても、コンパイル済みの`out/exporters/html-exporter.js`をNode.jsから直接実行してHTML出力を検証できる:

```js
const { HtmlExporter } = require('./out/exporters/html-exporter');
const yaml = require('yaml');
const fs = require('fs');
const dsl = yaml.parse(fs.readFileSync('./sample/01-basic/sample.tui.yml', 'utf8'));
new HtmlExporter().export(dsl, { format: 'html' }).then(html => console.log(html));
```
