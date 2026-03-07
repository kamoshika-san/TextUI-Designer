# TextUI Designer

YAML / JSON ベースの DSL で UI を設計し、**VS Code 上でライブプレビューしながら開発できる拡張機能**です。  
「UI をコードレビューしやすいテキストとして管理したい」「実装前に画面構成を素早く固めたい」ケースに向いています。

---

## できること

- **宣言的 UI 設計**: `*.tui.yml` / `*.tui.yaml` に画面構成を記述
- **ライブプレビュー**: `TextUI: Open Preview` で WebView プレビューを即表示
- **IntelliSense / バリデーション**: JSON Schema + Ajv による補完・型検証
- **診断表示**: YAML 構文エラーやスキーマ違反をエディタ上で可視化
- **スニペット挿入**: `tui:form` など主要テンプレートを素早く展開
- **複数形式へのエクスポート**: HTML / React / Pug（CLIでは Vue / Svelte も）へ出力
- **テーマ適用**: `textui-theme.yml` によるデザイントークン管理

---

## クイックスタート

1. VS Code で `sample.tui.yml`（または任意の `*.tui.yml`）を作成
2. 以下のような DSL を記述
3. コマンドパレットで **`TextUI: Open Preview`** を実行

```yaml
page:
  id: welcome
  title: "TextUI Sample"
  layout: vertical
  components:
    - Text:
        variant: h1
        value: "こんにちは TextUI"
    - Input:
        label: "メールアドレス"
        name: email
        type: email
        required: true
    - Button:
        kind: primary
        label: "送信"
        submit: true
```

> 既存サンプルは `sample/` 配下にあります（basic / theme / include / theme-inheritance）。

---

## 対応コンポーネント（主要）

- Text
- Alert
- Divider
- Input
- Checkbox
- Radio
- Select
- Button
- Container
- Form

---

## テーマ機能

プロジェクトルートに `textui-theme.yml` を置くと、カラー・タイポグラフィ・スペーシングなどをトークンとして一元管理できます。

```yaml
theme:
  name: "my-theme"
  version: "1.0.0"
  tokens:
    color:
      primary: "#3B82F6"
      text:
        primary: "#111827"
    spacing:
      md: "1rem"
```

テーマ保存時はプレビューへ即時反映されます。

---

## コマンド

- `TextUI: Open Preview`
- `TextUI: Export`
- `TextUI: 新規テンプレート作成`
- `TextUI: テンプレート挿入`
- `TextUI: 設定を開く`
- `TextUI: スキーマを再初期化`
- `TextUI: パフォーマンスレポートを表示`

---

## 開発者向け

### セットアップ

```bash
npm install
```

### よく使う npm scripts

```bash
npm run compile          # TypeScript コンパイル
npm run build-webview    # WebView (Vite) ビルド
npm run lint             # ESLint
npm test                 # pretest + unit test
npm run test:all         # unit / integration / e2e / regression
npm run package          # extension package build
```

CI運用テンプレート（DSL validate + plan）は `doc/CI_TEMPLATE.md` を参照してください。

### CLI

```bash
npm run cli
# または
npx textui

# provider一覧
npx textui providers --json

# OpenAPIからDSLを生成
npx textui import openapi --input openapi.yaml --output generated/from-openapi.tui.yml

# OpenAPIの全operationを一括生成
npx textui import openapi --input openapi.yaml --all --output-dir generated/from-openapi

# Vue / Svelte への出力（CLI）
npx textui export --file sample/01-basic/sample.tui.yml --provider vue --output generated/App.vue
npx textui export --file sample/01-basic/sample.tui.yml --provider svelte --output generated/App.svelte
```

---

## エクスポート機能のローカル確認（VS Code なし）

```js
const { HtmlExporter } = require('./out/exporters/html-exporter');
const yaml = require('yaml');
const fs = require('fs');

const dsl = yaml.parse(fs.readFileSync('./sample/01-basic/sample.tui.yml', 'utf8'));
new HtmlExporter().export(dsl, { format: 'html' }).then(html => console.log(html));
```

---

## 技術スタック

- TypeScript
- VS Code Extension API
- React + Vite（WebView）
- Tailwind CSS
- JSON Schema + Ajv

---

## ライセンス

MIT
