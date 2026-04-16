# TextUI Designer

**Design UI screens in YAML. Preview them live. Export to HTML, React, Svelte, Vue, or Pug — without writing layout code.**

TextUI Designer is a VS Code extension that turns a simple YAML description into a live UI preview and production-ready frontend code. Describe your screen, see it instantly, and ship the markup.

![TextUI Designer icon](icon.png)

---

## できること

Write a `.tui.yml` file describing your page and components. The extension renders a live preview in a side panel and can export the design to multiple frontend formats with one command.

```yaml
page:
  id: sign-up
  title: "Sign Up"
  layout: vertical
  components:
    - Text:
        variant: h1
        value: "Create your account"
    - Input:
        label: "Email address"
        name: email
        type: email
        required: true
    - Input:
        label: "Password"
        name: password
        type: password
        required: true
    - Button:
        kind: primary
        label: "Sign Up"
        submit: true
```

Open `TextUI: Open Preview` → see it rendered. Run `TextUI: Export to Code` → get HTML, React, Svelte, Vue, or Pug output ready to drop into your project.

---

## 主な機能

- **Live preview** — React-powered WebView refreshes as you type
- **Multi-format export** — generates HTML, React, Svelte, Vue, and Pug output from the same DSL
- **20+ built-in components** — buttons, inputs, forms, tables, modals, tabs, and more
- **Theme support** — define a `textui-theme.yml` to apply consistent colors and spacing across preview and export
- **Component includes** — split large screens into reusable `.tui.yml` fragments with `$include`
- **DSL validation** — schema-backed diagnostics catch typos and missing required fields inline
- **Export dry-run** — preview the generated code before writing files with `TextUI: Export Preview`
- **Jump-to-DSL** — Ctrl+Shift+Click any component in the preview to jump to its source YAML

---

## はじめに

### インストール

Search for **TextUI Designer** in the VS Code Extensions panel, or install from the `.vsix` file:

```
Extensions panel → ••• → Install from VSIX → select the file
```

### 最初の画面を作る

1. Create a file ending in `.tui.yml` (e.g. `dashboard.tui.yml`)
2. Add the minimal page structure:

```yaml
page:
  id: my-screen
  title: "My Screen"
  layout: vertical
  components:
    - Text:
        variant: h1
        value: "Hello, TextUI"
    - Button:
        kind: primary
        label: "Get started"
```

3. Run **TextUI: Open Preview** from the Command Palette (`Ctrl+Shift+P`)
4. Edit the file — the preview updates live

### Phase 1 ゴールデンパス

Phase 1 では、初回成功体験を以下 3 本に固定します。導入時の標準チェックとして使ってください。

1. **パス1（最短体験）**: `.tui.yml` を作成 → **TextUI: Open Preview** を実行
2. **パス2（Flow導線）**: `sample/12-navigation/app.tui.flow.yml` を開く → **TextUI: Open Flow Preview** を実行 → 遷移先の **Open linked page** でページ遷移を確認
3. **パス3（AI導線）**: MCP `scaffold_app` → `validate_ui`/`validate_flow` → `capture_preview`

サンプル起点は `sample/README.md` を参照してください。

### コードへエクスポート

Run **TextUI: Export to Code** to generate frontend code. The default format is HTML; change the target in extension settings:

| Setting | Values |
|---|---|
| `textui-designer.export.defaultFormat` | `html` (default), `react`, `svelte`, `vue`, `pug` |

---

## コンポーネント一覧

All components use the same YAML syntax: the component name as the key, properties as children.

| Category | Components |
|---|---|
| Text & media | `Text`, `Link`, `Image`, `Icon`, `Badge`, `Progress` |
| Navigation | `Breadcrumb`, `Tabs`, `TreeView` |
| Input & form | `Input`, `Checkbox`, `Radio`, `Select`, `DatePicker`, `Form`, `Button` |
| Layout | `Container`, `Divider`, `Spacer` |
| Feedback | `Alert`, `Accordion`, `Modal`, `Table` |

Full component reference and property lists: [`sample/`](sample)

---

## テーマ対応

Create a `textui-theme.yml` next to your DSL files to apply a consistent visual style:

```yaml
colors:
  primary: "#2563eb"
  background: "#ffffff"
  surface: "#f1f5f9"
  text: "#1e293b"
```

The preview and all export targets use the same theme values.

---

## エクスポート形式

| Format | File | Notes |
|---|---|---|
| HTML | `.html` | Self-contained, Tailwind-class markup |
| React | `.jsx` | JSX template output for React projects |
| Svelte | `.svelte` | `<script lang="ts">` + `<style>` layout |
| Vue | `.vue` | `<script setup lang="ts">` + `<style scoped>` layout |
| Pug | `.pug` | Pug template output for server-rendered stacks |

---

## ナビゲーションフロー

TextUI Designer supports multi-screen navigation flows defined in a `.tui.flow.yml` file alongside your screen files.

```yaml
# myapp.tui.flow.yml
flow:
  entry: sign-in
  screens:
    - id: sign-in
      file: sign-in.tui.yml
      transitions:
        - trigger: "Submit"
          target: dashboard
        - trigger: "Forgot password"
          target: reset-password
    - id: dashboard
      file: dashboard.tui.yml
    - id: reset-password
      file: reset-password.tui.yml
```

Open **TextUI: Open Flow Preview** to see the screen map. Selecting any screen in the map shows:

- **Routes to here** — all loop-free paths from the entry screen to the selected screen, with full trigger chains. Paginated when more than 5 routes exist.
- **Screen detail** — the rendered preview of the selected screen on the right.

Click **Open linked page** on any transition target to jump directly into that screen's preview. A **Back to flow** button appears at the top of the preview, returning you to the flow map.

---

## MCP サーバー

TextUI Designer ships a built-in **MCP (Model Context Protocol) server** that exposes the full DSL toolchain to AI assistants. Any MCP-compatible client (Claude, Cursor, Copilot Chat, etc.) can call these tools to generate, validate, and scaffold TextUI DSL files without manual YAML editing.

### 接続設定

Add the following to your MCP client configuration:

```json
{
  "mcpServers": {
    "textui": {
      "command": "node",
      "args": ["<path-to-extension>/out/mcp/server.js"]
    }
  }
}
```

ローカル確認では、次のコマンドでも起動できます:

```bash
npm run mcp:serve
```

### 主要ツール

| Tool | What it does |
|---|---|
| `generate_ui` | Generates a `.tui.yml` screen DSL from a component blueprint |
| `generate_flow` | Scaffolds a `.tui.flow.yml` navigation flow from screen IDs and transition hints |
| `scaffold_app` | Generates all screen DSL files + a navigation flow YAML in one call |
| `validate_ui` | Validates a DSL string or file and returns structured diagnostics |
| `validate_flow` | Validates a `.tui.flow.yml` file |
| `capture_preview` | Renders a DSL file to a PNG screenshot |
| `explain_error` | Translates validation diagnostics into human-readable fix suggestions |
| `preview_schema` | Returns the JSON Schema for any DSL type (`main`, `navigation`, `theme`, `template`) |

### AI 協働 DSL 生成フロー

AI アシスタントとの典型フロー:

1. 要件を伝える（画面・遷移・役割を短文で指定）
2. `scaffold_app` で DSL 一式を生成
3. `validate_ui` / `validate_flow` で検証
4. `capture_preview` で見た目を確認
5. 指摘を反映して再生成・再検証

プロンプト例:
> 「3画面のアプリ（Login → Dashboard → Settings）を作って。DSL と flow を生成し、validate して Dashboard の preview を出して。」

AI は `scaffold_app` → `validate_flow` → `capture_preview` の順で実行します。

---

## 追加サンプル

`sample/` は「教材」ではなく「導線」です。Phase 1 では次の3系統を優先して使ってください。

- 最短体験: [`sample/01-basic/`](sample/01-basic/)（Preview / Export の最短確認）
- Flow導線: [`sample/12-navigation/`](sample/12-navigation/)（Flow Preview からページ遷移を確認）
- AI導線: [`sample/08-github/`](sample/08-github/)（AIでの scaffold/validate/capture 前提の分割構成例）

インデックスと開始順は [`sample/README.md`](sample/README.md) を参照してください。

---

## 開発者向け

The sections below are for developers working on the extension itself.

### クイックセットアップ

```bash
npm install
npm run compile
npm run build-webview
npm test
```

詳細セットアップ: [docs/SETUP.md](docs/SETUP.md)

### 主要コマンド

| Command | Use |
|---|---|
| `npm run compile` | TypeScript compile + schema checks |
| `npm run build-webview` | Build React + Vite WebView assets |
| `npm run lint` | ESLint (zero warnings) |
| `npm test` | Compile, lint, unit tests |
| `npm run test:all:ci` | Full CI-equivalent lane |
| `npm run package:vsix` | Build local `.vsix` |

### 開発ドキュメント

- [Setup](docs/SETUP.md) · [Testing](docs/TESTING.md) · [Contributing](CONTRIBUTING.md) · [FAQ](docs/FAQ.md)
- [Extension Boundary Guide](docs/extension-boundary-guide.md) · [Exporter Boundary Guide](docs/exporter-boundary-guide.md)
- [Adding Built-In Component](docs/adding-built-in-component.md) · [Glossary](docs/GLOSSARY.md)

---

## License

MIT
