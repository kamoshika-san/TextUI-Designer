# TextUI Designer

YAML / JSON ベースの DSL で UI を設計し、**VS Code 上でライブプレビューしながら開発できる拡張機能**です。  
「UI をコードレビューしやすいテキストとして管理したい」「実装前に画面構成を素早く固めたい」ケースに向いています。

---

## できること

- **宣言的 UI 設計**: `*.tui.yml` / `*.tui.yaml` に画面構成を記述
- **ライブプレビュー**: `TextUI: Open Preview` で WebView プレビューを即表示
- **プレビュー画像出力**: `TextUI: Capture Preview Image` / CLI / MCP からPNGを生成
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
- DatePicker
- Button
- Container
- Form
- Accordion
- Tabs
- TreeView
- Table
- Spacer

> v0.5.1 で `Spacer` / `TreeView` に対応し、`sample/01-basic` は全対応コンポーネントを使うサンプルに更新しました。

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
また、プレビューで選択中のテーマは「TextUI: Export」実行時のHTML成果物にも反映されます。

---

## コマンド

- `TextUI: Open Preview`
- `TextUI: Capture Preview Image`
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
npm run test:quick       # ローカル高速確認（compile + unit）
npm run test:all         # unit / integration / e2e / regression
npm run test:all:ci      # CI向け（compile + lint + all tests）
npm run package          # extension package build
```

CI運用テンプレート（DSL validate + plan）は `docs/CI_TEMPLATE.md` を参照してください。


### コアモジュール依存関係（責務分割）

```text
TextUICoreEngine
  ├─ TextUiCoreComponentBuilder（ドメイン: コンポーネント正規化）
  └─ textui-core-helpers（I/O + 解析 + 整形）

ReactExporter
  └─ react-template-renderer（表示/整形: JSXテンプレート生成）

SchemaManager
  ├─ SchemaCacheStore（ロード/キャッシュ）
  └─ schema-validator（検証）
```

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

# HTML出力時にテーマを明示適用
npx textui export --file sample/01-basic/sample.tui.yml --provider html --theme sample/02-theme/textui-theme.yml --output generated/themed.html

# プレビュー画像(PNG)を出力（テーマ適用可）
npx textui capture --file sample/01-basic/sample.tui.yml --theme sample/02-theme/textui-theme.yml --output generated/sample.preview.png
```

### MCP

MCPでは次の2通りでプレビュー画像を出力できます（どちらもテーマ指定可）。

- `capture_preview` ツールを直接呼び出す（`themePath` を指定）
- `run_cli` で `["capture", "--file", "...", "--theme", "...", "--json"]` を実行する

HTML出力・プレビュー画像キャプチャーともに、テーマを適用したい場合は `--theme`（`capture_preview` では `themePath`）を渡してください。

MCP実装の責務分離は以下の通りです。

- `src/mcp/server.ts`: JSON-RPC入出力 / dispatch / tool・resource実行
- `src/mcp/request-handlers.ts`: `initialize` / `resources/*` / `prompts/*` などのハンドラ定義
- `src/mcp/params.ts`: 引数抽出と共通バリデーション
- `src/mcp/registry.ts`: resources/prompts の static registry

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
