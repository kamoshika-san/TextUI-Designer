# TextUI Designer

**Design UI as Code inside VS Code. Write YAML. Preview instantly. Export to frontend code. Compare design changes semantically.**

TextUI Designer is a VS Code extension for teams that want UI structure to be readable, reviewable, and reusable. Describe screens in YAML, inspect them in a live Preview, explore navigation flows, compare changes, and export production-ready HTML, React, Svelte, Vue, or Pug.

![TextUI Designer icon](icon.png)

---

## What It Does

Write a `.tui.yml` file describing your page and components. The extension renders a live Preview in a side panel, supports Flow Preview for navigation maps, provides semantic/overlay diff workflows, and can export the design to multiple frontend formats with one command.

![live-preview](resource\live-preview.gif)

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

Open `TextUI: Preview Current File` -> see it rendered. Run `TextUI: Export Current File` -> get HTML, React, Svelte, Vue, or Pug output ready to drop into your project.

---

## Who It Is For

- Frontend engineers who want screen structure to be easy to review in code.
- Design-system and prototyping teams who want repeatable UI samples without rebuilding layouts by hand.
- AI-assisted development workflows that need deterministic YAML, validation, preview capture, and export.

TextUI Designer is not a full visual drag-and-drop builder. It is a UI-as-code workflow for authoring, previewing, comparing, and exporting structured screens from YAML.

---

## 30-Second Quick Start

1. Create `hello.tui.yml` with the sample below.
2. Run **TextUI: Preview Current File**.
3. Edit a label in YAML and confirm the Preview updates.
4. Run **TextUI: Export Preview (Dry Run)** to inspect generated code.
5. Open `sample/12-navigation/app.tui.flow.yml` and run **TextUI: Preview Flow**.

The VS Code walkthrough **Get started with TextUI Designer** mirrors this path inside the editor after installation.

---

## Key Features

- **Live preview** — React-powered WebView refreshes as you type
- **Flow preview** — inspect multi-screen navigation and linked screen routes
- **Semantic and overlay diff** — compare TextUI changes by structure and meaning
- **Multi-format export** — generates HTML, React, Svelte, Vue, and Pug output from the same DSL
- **20+ built-in components** — buttons, inputs, forms, tables, modals, tabs, and more
- **Theme support** — define a `textui-theme.yml` to apply consistent colors and spacing across preview and export
- **Component includes** — split large screens into reusable `.tui.yml` fragments with `$include`
- **DSL validation** — schema-backed diagnostics catch typos and missing required fields inline
- **Export dry-run** — preview the generated code before writing files with `TextUI: Export Preview`
- **Jump-to-DSL** — Ctrl+Shift+Click any component in the preview to jump to its source YAML

---

## Getting Started

### Installation

Search for **TextUI Designer** in the VS Code Extensions panel, or install from the `.vsix` file:

```
Extensions panel → ••• → Install from VSIX → select the file
```

### Create Your First Screen

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

3. Run **TextUI: Preview Current File** from the Command Palette (`Ctrl+Shift+P`)
4. Edit the file — the preview updates live

### Phase 1 Golden Path

Phase 1 defines three fixed onboarding paths as the standard check for new users.

1. **Path 1 (quickest)**: Create a `.tui.yml` file -> run **TextUI: Preview Current File**
2. **Path 2 (Flow)**: Open `sample/12-navigation/app.tui.flow.yml` -> run **TextUI: Preview Flow** -> use **Open linked page** on a transition target to confirm screen navigation
3. **Path 3 (AI)**: MCP `scaffold_app` → `validate_ui`/`validate_flow` → `capture_preview`

For starting samples, see `sample/README.md`.

### Export to Code

Run **TextUI: Export Current File** to generate frontend code. The default format is HTML; change the target in extension settings:

| Setting | Values |
|---|---|
| `textui-designer.export.defaultFormat` | `html` (default), `react`, `svelte`, `vue`, `pug` |

### Settings Guide

Basic settings are the ones most users may adjust during normal authoring:

| Setting | Use when |
|---|---|
| `textui-designer.autoPreview.enabled` | Open Preview automatically when opening TextUI files |
| `textui-designer.export.defaultFormat` | Change the default export target |
| `textui-designer.webview.theme` | Match VS Code, force light, or force dark Preview |
| `textui-designer.webview.fontSize` | Tune Preview readability |
| `textui-designer.preview.showUpdateIndicator` | Show or hide refresh status in Preview |
| `textui-designer.webview.jumpToDsl.showHoverIndicator` | Show or hide Jump-to-DSL hover guidance |

Advanced settings are for diagnostics, schema cache behavior, performance timing, memory tracking, MCP configuration, and troubleshooting commands. Keep defaults unless you are debugging, tuning a large workspace, or integrating MCP clients.

---

## Component Reference

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

## Theming

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

## Export Formats

| Format | File | Notes |
|---|---|---|
| HTML | `.html` | Self-contained, Tailwind-class markup |
| React | `.jsx` | JSX template output for React projects |
| Svelte | `.svelte` | `<script lang="ts">` + `<style>` layout |
| Vue | `.vue` | `<script setup lang="ts">` + `<style scoped>` layout |
| Pug | `.pug` | Pug template output for server-rendered stacks |

---

## Navigation Flow

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

Open **TextUI: Preview Flow** to see the screen map. Selecting any screen in the map shows:

- **Routes to here** — all loop-free paths from the entry screen to the selected screen, with full trigger chains. Paginated when more than 5 routes exist.
- **Screen detail** — the rendered preview of the selected screen on the right.

Click **Open linked page** on any transition target to jump directly into that screen's preview. Return controls then appear at the top-left of the preview so you can go back to the previous screen or return to the flow map.

---

## MCP Server

TextUI Designer ships a built-in **MCP (Model Context Protocol) server** that exposes the full DSL toolchain to AI assistants. Any MCP-compatible client (Claude, Cursor, Copilot Chat, etc.) can call these tools to generate, validate, and scaffold TextUI DSL files without manual YAML editing.

### Configuration

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

For local verification, you can also start it with:

```bash
npm run mcp:serve
```

Extension-side auto configuration policy:

- `textui-designer.mcp.autoConfigure` (default: `true`) updates MCP client settings on startup.
- `textui-designer.mcp.scope=workspace` updates workspace `.vscode/mcp.json`.
- `textui-designer.mcp.scope=user|both` may update user MCP config and Codex `.codex/config.toml` (`mcp_servers` block).
- Set `textui-designer.mcp.autoConfigure=false` when your organization requires manual review or managed policy for config files.

### Available Tools

| Tool | What it does |
|---|---|
| `generate_ui` | Generates a `.tui.yml` screen DSL from a component blueprint |
| `generate_flow` | Scaffolds a `.tui.flow.yml` navigation flow from screen IDs and transition hints; optional `loopPolicy` (`allow` / `warn` / `deny`) emits `policy.loops` for Navigation v2 |
| `scaffold_app` | Generates all screen DSL files + a navigation flow YAML in one call |
| `validate_ui` | Validates a DSL string or file and returns structured diagnostics |
| `validate_flow` | Validates a `.tui.flow.yml` file |
| `capture_preview` | Renders a DSL file to a PNG screenshot |
| `explain_error` | Translates validation diagnostics into human-readable fix suggestions |
| `preview_schema` | Returns the JSON Schema for any DSL type (`main`, `navigation`, `theme`, `template`) |

### AI-Assisted DSL Generation Workflow

Typical workflow with an AI assistant:

1. Describe your requirements (screens, transitions, and roles in a short sentence)
2. Generate all DSL files with `scaffold_app`
3. Validate with `validate_ui` / `validate_flow`
4. Check the appearance with `capture_preview`
5. Apply feedback and regenerate / re-validate

Example prompt:
> "Build a 3-screen app (Login → Dashboard → Settings). Generate the DSL and flow, validate them, and show a preview of Dashboard."

The AI runs `scaffold_app` → `validate_flow` → `capture_preview` in sequence.

---

## Samples

`sample/` is a guided onboarding path, not a tutorial. For Phase 1, start with these three tracks:

- Quickest path: [`sample/01-basic/`](sample/01-basic/) (fastest check of Preview / Export)
- Flow track: [`sample/12-navigation/`](sample/12-navigation/) (confirm screen navigation from Flow Preview)
- AI track: [`sample/08-github/`](sample/08-github/) (split-screen example designed for scaffold/validate/capture via AI)

For the index and recommended starting order, see [`sample/README.md`](sample/README.md).

---

## For Developers

The sections below are for developers working on the extension itself.

### Quick Setup

```bash
npm install
npm run compile
npm run build-webview
npm test
```

Detailed setup: [docs/current/workflow-onboarding/SETUP.md](docs/current/workflow-onboarding/SETUP.md)

### Package Governance

- For scripts, package payload, dependencies, and overrides, use [package-json-governance.md](docs/current/operations/package-json-governance.md).
- Do not hand-edit the merged `package.json` `contributes` block. Edit `package-contributes/*.json`, then run `npm run sync:package-contributes`.
- For contributes review, prefer `npm run inspect:contributes`, `npm run diff:contributes:fragments`, and `npm run contributes:pr-summary`.

### Package `contributes`（T-003 / T-011）

- **`package.json` の `contributes` は手編集しない**。`package-contributes/*.json` をソースとし、`npm run sync:package-contributes` で `package.json` にマージする。
- **通常は `package.json` の contributes ブロックを開かずに済ませる**: 全体像は **`npm run inspect:contributes`**（Markdown は `--markdown` または `npm run inspect:contributes:markdown`）、フラグメント単位の差分は **`npm run diff:contributes:fragments`**、責務の表は **[docs/current/services-webview/package-contributes-fragments-responsibility.md](docs/current/services-webview/package-contributes-fragments-responsibility.md)**（`npm run docs:package-contributes` で再生成）。PR 説明用に両方まとめる場合は **`npm run contributes:pr-summary`**（`--base=main` 可）。
- **commands / menus**: `npm run sync:commands`（`package-contributes/commands.json` · `menus.json` を生成してマージ）
- **configuration**: `npm run sync:configuration`（`package-contributes/configuration.json` を生成してマージ）
- **languages / snippets / yaml.schemas / jsonValidation**: `package-contributes/languages-snippets.json` と `package-contributes/schemas.json` を編集し、必要なら `npm run sync:package-contributes`

### Key Commands

| Command | Use |
|---|---|
| `npm run compile` | TypeScript compile + schema checks |
| `npm run build-webview` | Build React + Vite WebView assets |
| `npm run check:webview-media-drift` | Regenerate WebView assets and fail if `media/` differs from committed files (same gate as CI **T-002**) |
| `npm run sync:package-contributes` | Merge `package-contributes/*.json` into `package.json` → `contributes` (**T-003**) |
| `npm run inspect:contributes` | Merged `contributes` を論理ブロック別に要約表示（**T-011**） |
| `npm run diff:contributes:fragments` | `package-contributes/` の git diff サマリ（**T-011**） |
| `npm run docs:package-contributes` | フラグメント責務ドキュメントを再生成（**T-011**） |
| `npm run contributes:pr-summary` | PR 貼付用 Markdown（inspect + diff、**T-011**） |
| `npm run lint` | ESLint (zero warnings) |
| `npm test` | Compile, lint, unit tests |
| `npm run test:all:ci` | Full CI-equivalent lane |
| `npm run package:vsix` | Build local `.vsix` |

### Developer Docs

- [Setup](docs/current/workflow-onboarding/SETUP.md) · [Testing](docs/current/workflow-onboarding/TESTING.md) · [Contributing](CONTRIBUTING.md) · [FAQ](docs/current/workflow-onboarding/FAQ.md)
- [Extension Boundary Guide](docs/current/runtime-boundaries/extension-boundary-guide.md) · [Exporter Boundary Guide](docs/current/runtime-boundaries/exporter-boundary-guide.md)
- [Adding Built-In Component](docs/current/workflow-onboarding/adding-built-in-component.md) · [Glossary](docs/current/workflow-onboarding/GLOSSARY.md)
- [Semantic Meaning / Diff Taxonomy（日本語・将来向け）](docs/future/semantic/semantic-meaning-core-ontology-v0-ja.md) · [旧パススタブ](docs/archive/semantic-meaning-core-ontology-v0-ja.md)

---

## License

MIT
