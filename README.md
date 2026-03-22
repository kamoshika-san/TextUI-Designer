# TextUI Designer

YAML / JSON ベースの DSL で UI を設計し、**VS Code 上でライブプレビューしながら開発できる拡張機能**です。  
「UI をコードレビューしやすいテキストとして管理したい」「実装前に画面構成を素早く固めたい」ケースに向いています。

---

## 初日に読む順序

1. この `README.md`（クイックスタートまで）
2. `docs/extension-boundary-guide.md`（VS Code拡張の境界）
3. `docs/cli-boundary-guide.md`（CLIの境界）
4. `docs/mcp-boundary-guide.md`（MCPの境界）
5. `docs/exporter-boundary-guide.md`（Exporterの境界）
6. `docs/MAINTAINER_GUIDE.md`（保守運用の詳細）
7. `docs/quality-gate-green-main.md`（push/PR 前の最低限品質・緑の main）
8. `docs/adding-built-in-component.md`（ビルトインコンポーネント追加のチェックリスト）

## 境界別ガイド

- VS Code拡張: `docs/extension-boundary-guide.md`
- CLI: `docs/cli-boundary-guide.md`
- MCP: `docs/mcp-boundary-guide.md`
- Exporter: `docs/exporter-boundary-guide.md`
- テーマ/トークン: `docs/THEME_IMPLEMENTATION.md`
- 設定キー: `docs/SETTINGS.md`
- 互換ポリシー: `docs/api-compat-policy.md`

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
- Link
- Breadcrumb
- Badge
- Icon
- Image
- Progress
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
>
> v0.6.0 で `Badge` / `Image` / `Progress` / `Icon` / `Link` / `Breadcrumb` を追加し、`sample/08-github`（GitHub風の大規模サンプル）を追加しました。
>
> v0.7.0 では DSL 型の正本を `src/domain/dsl-types` に整理し、テーマ切替・プレビュー更新・SchemaManager のテスト容易性を重点的に改善しました。

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
npm run check:dsl-types-ssot  # SSoT import-boundary チェック
npm run build-webview    # WebView (Vite) ビルド
npm run lint             # ESLint
npm test                 # pretest + unit test
npm run test:quick       # ローカル高速確認（compile + unit）
npm run test:all         # unit / integration / e2e / regression
npm run test:all:ci      # CI向け（compile + lint + all tests）
npm run package          # extension package build
npm run validate:samples:fresh    # サンプル検証（compileしてから実行）
```

**`test:e2e` の意味（`T-20260321-084`）**  
`npm run test:e2e` は **実 VS Code 上の E2E ではなく**、`tests/setup.js` で `vscode` をモックした **Node + Mocha の simulated シナリオ**です。詳細は `tests/README.md` の「Simulated E2E」を参照してください。

**ユニットテストと `out/`（`T-20260320-014`）**  
多くの `tests/unit/*.js` は `require('../out/...')` でコンパイル済み JS を読みます。`npm test` / `npm run test:quick` / `npm run test:all:ci` は `compile` を先に実行しますが、**`npm run test:unit` 単体では `compile` を実行しない**ため、リポジトリをクリーンにした直後や `out/` を消した状態では失敗し得ます。初回・クリーン後は `npm run compile` のあとに `npm run test:unit` を実行するか、`npm run test:quick` / `npm test` を使ってください。`tests/setup.js` では `out/extension.js` が無い場合に早期失敗し、上記を案内します（`TEXTUI_TEST_SKIP_OUT_CHECK=1` でオプトアウト可能）。

CI運用テンプレート（DSL validate + plan）は `docs/CI_TEMPLATE.md` を参照してください。

### PR前のSSoT最小チェック

共有 DSL 型まわりを変更したときは、PR前に次を実行してください。

```bash
npm run check:dsl-types-ssot
```


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

### CLI / MCP / Exporter の詳細

README では導線のみを維持し、実運用の詳細は境界別ガイドへ分割しています。

- CLI: `docs/cli-boundary-guide.md`
- MCP: `docs/mcp-boundary-guide.md`
- Exporter: `docs/exporter-boundary-guide.md`

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
