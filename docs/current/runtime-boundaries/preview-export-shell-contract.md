# Preview / Export Shell Contract

This note captures the current shell-level layout contract that sits outside the shared React component kernel.
Use it when investigating width drift between WebView preview and HTML export / preview capture.

## Scope

- In scope: width-affecting shell rules outside `renderRegisteredComponent`
- Out of scope: `Container` implementation details, WebView-only controls, sample-specific CSS fixes

## Current Contract

| Lane | Owner file | Width-affecting rule | Notes |
| --- | --- | --- | --- |
| WebView document | `src/renderer/components/styles/Globals.css` | `body { padding: 0 20px; }` | Adds horizontal inset before `#root` exists |
| WebView root | `src/renderer/components/styles/Globals.css` | `#root { padding: 1rem; min-height: 100vh; }` | Applies only in WebView DOM, not static export body |
| WebView preview shell | `src/renderer/webview.tsx` | `.textui-preview-root` host rendered with `style={{ padding: 24, position: 'relative' }}` | Shared component tree is mounted inside this shell |
| Static export wrapper | `src/exporters/react-static-export.ts` | outer wrapper `div` uses `width: '100%'`, `maxWidth: '100%'`, `padding: 24` | This is the export-side approximation of the preview shell |
| HTML document shell | `src/exporters/html-template-builder.ts` | export `body` uses `padding: 0`; `html, body { max-width: 100%; overflow-x: auto; }` | No `#root` / `.textui-preview-root` structure exists in export HTML |

## Why Pattern A Drifts

`docs/future/semantic/webview-layout-v2/pattern-a-triage-dashboard.tui.yml` uses a horizontal 3-column layout with:

- left fixed-ish column
- center `width: "0"`, `flexGrow: 2`, `minWidth: "36rem"`
- right `width: "0"`, `flexGrow: 1`, `minWidth: "22rem"`

This makes parent available width part of the layout contract.
Even when `Container` itself is shared, WebView and export/capture can diverge because they do not share the same outer shell.

## Design Boundary For Follow-up

- Shared later: shell core that affects width calculation
- Keep lane-specific: WebView-only adornments such as Export button, Theme toggle, Jump to DSL affordances, onboarding, VS Code wiring

## Guard Expectation

If any of the shell rules above changes, update:

- this document
- `tests/unit/webview-capture-layout-parity.test.js`
- any follow-up `PreviewShellCore` implementation ticket that depends on the baseline
