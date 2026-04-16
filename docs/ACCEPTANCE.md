# Acceptance Scenarios

This document maps the Phase 1 golden paths to their test coverage. Use it to verify release confidence from a user perspective without reading implementation test files.

---

## Path 1 — Preview (quickest)

**Scenario:** A user creates a `.tui.yml` file and opens a live preview.

**Steps:**
1. Create or open any `.tui.yml` file (e.g. `sample/01-basic/sample.tui.yml`)
2. Run **TextUI: Open Preview** from the Command Palette

**Automated coverage:**

| Test file | What it verifies |
|---|---|
| `tests/vscode-smoke/suite/extension-host-smoke.test.js` | Real VS Code host: extension activates and preview webview opens |
| `tests/unit/open-preview-command.test.js` | Command routes to the correct DSL file; handles unsupported files |
| `tests/unit/golden-path-acceptance.test.js` — `[Path 1 / Preview]` | DSL for `sample/01-basic` loads and exports to HTML without errors |

---

## Path 2 — Flow

**Scenario:** A user opens a flow file and navigates between screens using the flow preview.

**Steps:**
1. Open `sample/12-navigation/app.tui.flow.yml`
2. Run **TextUI: Open Flow Preview**
3. Select a transition target and click **Open linked page**
4. Confirm the screen preview loads; use **Back to flow** to return

**Automated coverage:**

| Test file | What it verifies |
|---|---|
| `tests/unit/flow-preview-panel.test.js` | FlowPreviewPanel renders nodes, edges, transitions, routes, and diff states |
| `tests/unit/navigation-flow-preview-refresh.test.js` | Flow preview refreshes correctly on file save |
| `tests/unit/golden-path-acceptance.test.js` — `[Path 2 / Flow]` | `sample/12-navigation/app.tui.flow.yml` is a parseable flow with ≥2 screens |

**Gap:** No automated end-to-end test for the **Open linked page → Back to flow** UI transition (requires real VS Code host). Manual verification required before release.

---

## Path 3 — AI

**Scenario:** An AI assistant uses the MCP toolchain to scaffold, validate, and preview a UI.

**Steps:**
1. Call `scaffold_app` to generate DSL files and a flow YAML
2. Call `validate_ui` / `validate_flow` to check for errors
3. Call `capture_preview` to render a screenshot

**Automated coverage:**

| Test file | What it verifies |
|---|---|
| `tests/unit/mcp-server.test.js` | Full MCP protocol: `generate_ui`, `validate_ui`, `validate_flow`, `capture_preview`, `scaffold_app` tool calls |
| `tests/unit/mcp-flow.test.js` | Flow-specific MCP tool behaviour |
| `tests/unit/golden-path-acceptance.test.js` — `[Path 3 / AI]` | MCP server entry point exists; `validate_ui` returns a result for a minimal DSL |

---

## Running the acceptance index

```bash
npx mocha --require tests/setup.js --timeout 20000 tests/unit/golden-path-acceptance.test.js
```

Expected output:

```
[Path 1 / Preview] User opens a .tui.yml and sees a live preview
  ✔ sample/01-basic/sample.tui.yml loads and exports to HTML without errors

[Path 2 / Flow] User opens a .tui.flow.yml and navigates between screens
  ✔ sample/12-navigation/app.tui.flow.yml is a valid flow file with at least 2 screens

[Path 3 / AI] User scaffolds, validates, and previews via MCP tools
  ✔ MCP server module loads and exposes scaffold_app, validate_ui, validate_flow, capture_preview
  ✔ validate_ui tool accepts a DSL string and returns a result via MCP server protocol
```
