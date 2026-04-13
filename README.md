# TextUI Designer

**Design UI screens in YAML. Preview them live. Export to HTML, React, Svelte, or Vue — without writing layout code.**

TextUI Designer is a VS Code extension that turns a simple YAML description into a live UI preview and production-ready frontend code. Describe your screen, see it instantly, and ship the markup.

![TextUI Designer icon](icon.png)

---

## What it does

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

Open `TextUI: Open Preview` → see it rendered. Run `TextUI: Export to Code` → get HTML, Svelte, or Vue output ready to drop into your project.

---

## Key features

- **Live preview** — React-powered WebView refreshes as you type
- **Multi-format export** — generates HTML, Svelte, and Vue output from the same DSL
- **20+ built-in components** — buttons, inputs, forms, tables, modals, tabs, and more
- **Theme support** — define a `textui-theme.yml` to apply consistent colors and spacing across preview and export
- **Component includes** — split large screens into reusable `.tui.yml` fragments with `$include`
- **DSL validation** — schema-backed diagnostics catch typos and missing required fields inline
- **Export dry-run** — preview the generated code before writing files with `TextUI: Export Preview`
- **Jump-to-DSL** — Ctrl+Shift+Click any component in the preview to jump to its source YAML

---

## Getting started

### Install

Search for **TextUI Designer** in the VS Code Extensions panel, or install from the `.vsix` file:

```
Extensions panel → ••• → Install from VSIX → select the file
```

### Create your first screen

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

### Export to code

Run **TextUI: Export to Code** to generate frontend code. The default format is HTML; change the target in extension settings:

| Setting | Values |
|---|---|
| `textui-designer.export.format` | `html` (default), `svelte`, `vue` |

---

## Component library

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

## Theme support

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

## Export formats

| Format | File | Notes |
|---|---|---|
| HTML | `.html` | Self-contained, Tailwind-class markup |
| Svelte | `.svelte` | `<script lang="ts">` + `<style>` layout |
| Vue | `.vue` | `<script setup lang="ts">` + `<style scoped>` layout |

---

## Navigation flow

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

## More examples

The [`sample/`](sample) directory contains working screens showing all components, theme inheritance, modal dialogs, enterprise layouts, and more.

---

## For contributors

The sections below are for developers working on the extension itself.

### Quick setup

```bash
npm install
npm run compile
npm run build-webview
npm test
```

Full setup guide: [docs/SETUP.md](docs/SETUP.md)

### Common commands

| Command | Use |
|---|---|
| `npm run compile` | TypeScript compile + schema checks |
| `npm run build-webview` | Build React + Vite WebView assets |
| `npm run lint` | ESLint (zero warnings) |
| `npm test` | Compile, lint, unit tests |
| `npm run test:all:ci` | Full CI-equivalent lane |
| `npm run package:vsix` | Build local `.vsix` |

### Contributor docs

- [Setup](docs/SETUP.md) · [Testing](docs/TESTING.md) · [Contributing](CONTRIBUTING.md) · [FAQ](docs/FAQ.md)
- [Extension Boundary Guide](docs/extension-boundary-guide.md) · [Exporter Boundary Guide](docs/exporter-boundary-guide.md)
- [Adding Built-In Component](docs/adding-built-in-component.md) · [Glossary](docs/GLOSSARY.md)

---

## License

MIT
