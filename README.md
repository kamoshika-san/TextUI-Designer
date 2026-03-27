# TextUI Designer

TextUI Designer is a VS Code extension for designing UI with a YAML / JSON DSL.

This page is the entry point for contributors. Use it to get from local setup to the main development flow quickly, then move to the deeper docs linked below.

## Start Here

1. Install dependencies: `npm install`
2. Build the extension output: `npm run compile`
3. Build the WebView assets: `npm run build-webview`
4. Run the unit lane: `npm test`
5. Open the subsystem guide that matches your change area

If you only need the local packaging / install flow for the extension, use [Local Installer](docs/LOCAL_INSTALLER.md).

## Common Commands

| Command | Use |
|---|---|
| `npm run compile` | TypeScript compile plus schema generation checks |
| `npm run build-webview` | Build the React + Vite WebView assets |
| `npm run lint` | Run ESLint with zero warnings allowed |
| `npm test` | Compile, lint, and run the unit test suite |
| `npm run test:all:ci` | Run the full CI-equivalent verification lane |
| `npm run react-ssot-check` | Focused React Preview / Export parity and theme contract checks |
| `npm run check:dsl-types-ssot` | Guard against `renderer/types` import regressions |
| `npm run metrics:collect` | Collect release-gate metrics |
| `npm run metrics:check:ssot` | Enforce `renderer/types imports = 0` |
| `npm run check:import-graph` | Check representative cross-lane import boundaries |
| `npm run package:vsix` | Build a local `.vsix` package |

## Main Developer Path

### Setup and local install

- [Local Installer](docs/LOCAL_INSTALLER.md): local `.vsix` build and installation flow
- [Settings](docs/SETTINGS.md): extension settings and configuration surface

### Testing and CI

- [Test Matrix](docs/test-matrix.md): what each test lane means and when to run it
- [CI Quality Gate](docs/ci-quality-gate.md): current CI entrypoints and required checks
- [Green Main Gate](docs/quality-gate-green-main.md): green-main expectations for push / PR flow
- [Real VS Code Smoke](docs/real-vscode-smoke.md): manual smoke checks that are not part of the default automated lane

### Runtime boundaries

- [Extension Boundary Guide](docs/extension-boundary-guide.md)
- [CLI Boundary Guide](docs/cli-boundary-guide.md)
- [MCP Boundary Guide](docs/mcp-boundary-guide.md)
- [Exporter Boundary Guide](docs/exporter-boundary-guide.md)

### Architecture and specification

- [Theme Implementation](docs/THEME_IMPLEMENTATION.md)
- [Schema Pipeline From Spec](docs/schema-pipeline-from-spec.md)
- [ADR directory](docs/adr)

### Operations and maintenance

- [Maintainer Guide](docs/MAINTAINER_GUIDE.md)
- [SSoT Monthly Review](docs/ssot-monthly-review.md)
- [SSoT Violation Playbook](docs/ssot-violation-playbook.md)

## Built-In Component Work

If your change touches built-in components, start with:

- [Adding Built-In Component](docs/adding-built-in-component.md)
- [Component Add Contract](docs/component-add-contract.md)
- [Component Registration Touchpoints](docs/component-registration-touchpoints.md)

This area is still being consolidated. Follow the linked leaf guides rather than adding new duplicated procedure text here.

## Product Overview

Core product capabilities:

- author UI in `*.tui.yml` / `*.tui.yaml`
- preview in a React WebView with `TextUI: Open Preview`
- export to code with `TextUI: Export to Code`
- capture preview images
- validate DSL with schema + diagnostics
- theme the preview / export path with `textui-theme.yml`

Supported built-in components currently include:

- `Text`
- `Alert`
- `Divider`
- `Link`
- `Breadcrumb`
- `Badge`
- `Icon`
- `Image`
- `Progress`
- `Input`
- `Checkbox`
- `Radio`
- `Select`
- `DatePicker`
- `Button`
- `Container`
- `Form`
- `Accordion`
- `Tabs`
- `TreeView`
- `Table`
- `Spacer`

## Example DSL

```yaml
page:
  id: welcome
  title: "TextUI Sample"
  layout: vertical
  components:
    - Text:
        variant: h1
        value: "Hello from TextUI"
    - Input:
        label: "Email address"
        name: email
        type: email
        required: true
    - Button:
        kind: primary
        label: "Submit"
        submit: true
```

More examples live under [`sample/`](sample).

## Exporter Quick Check

You can verify the compiled HTML exporter without launching VS Code:

```js
const { HtmlExporter } = require('./out/exporters/html-exporter');
const yaml = require('yaml');
const fs = require('fs');

const dsl = yaml.parse(fs.readFileSync('./sample/01-basic/sample.tui.yml', 'utf8'));
new HtmlExporter().export(dsl, { format: 'html' }).then(html => console.log(html));
```

## What This Page Does Not Cover

- full contributor workflow policy
- branch strategy and PR expectations
- canonical setup consolidation across all docs
- archive policy for historical docs

Those belong to upcoming documentation slices after this README rewrite.

## License

MIT
