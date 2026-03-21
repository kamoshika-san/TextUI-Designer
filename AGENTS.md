# AGENTS.md

## Cursor Cloud specific instructions

### プロジェクト概要

TextUI Designerは、YAML/JSONベースのDSLでUIを設計するVS Code拡張機能。単一リポジトリ（モノレポではない）。外部サービス・Docker・DB依存なし。

ローカル生成物（`generated/`、`.tmp-cli-*` など）は `.gitignore` によりリポジトリに含めない。

### 開発コマンド

`package.json`の`scripts`セクションを参照。主要コマンド:

| コマンド | 用途 |
|---|---|
| `npm run compile` | TypeScriptコンパイル（`src/` → `out/`） |
| `npm run build-webview` | Vite でWebView（React + Tailwind）をビルド（`media/`に出力） |
| `npm run lint` | ESLint実行（警告のみ、エラーなし） |
| `npm test` | ユニットテスト（`pretest`でcompile + lint実行後、Mochaで`tests/unit/**/*.js`を実行） |
| `npm run test:all` | 全テスト（unit → integration → e2e → regression） |

### テストに関する注意点

- テストは`vscode`モジュールをモック化して実行（`tests/setup.js`）。VS Code実行環境は不要。
- 現在の安定確認では`npm run test:all`（unit → integration → e2e → regression）が全件パス。
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
