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
| Shared root shell | `src/shared/preview-shell.tsx`, `src/renderer/components/styles/Globals.css` | `#root, .textui-preview-shell-root { padding: 1rem; min-height: 100vh; }` | Export/capture recreates the same root shell class used by WebView |
| Shared preview frame | `src/shared/preview-shell.tsx`, `src/renderer/components/styles/Globals.css` | `PreviewShellCore` renders `.textui-preview-root` with `width: 100%`, `maxWidth: 100%`, `padding: 24`, `position: relative` | Shared component tree is mounted inside the same frame in WebView and export |
| HTML document shell | `src/exporters/html-template-builder.ts` | export `body` now uses `padding: 0 20px` and wraps body content with `<div id="root" class="textui-preview-shell-root">...</div>` | `noWrap` export now recreates the WebView root shell contract instead of approximating it |

## Why Pattern A Drifts

`docs/future/semantic/webview-layout-v2/pattern-a-triage-dashboard.tui.yml` uses a horizontal 3-column layout with:

- left fixed-ish column
- center `width: "0"`, `flexGrow: 2`, `minWidth: "36rem"`
- right `width: "0"`, `flexGrow: 1`, `minWidth: "22rem"`

This makes parent available width part of the layout contract.
Even when `Container` itself is shared, WebView and export/capture can diverge if they do not share the same outer shell.
`PreviewShellCore` closes that gap by moving the width-affecting preview frame into a shared React helper and by recreating the root shell in export HTML.

## Design Boundary For Follow-up

- Shared now: shell core that affects width calculation (`PreviewShellCore`, root shell wrapper, export body padding)
- Keep lane-specific: WebView-only adornments such as Export button, Theme toggle, Jump to DSL affordances, onboarding, VS Code wiring

## Guard Expectation

If any of the shell rules above changes, update:

- this document
- `tests/unit/webview-capture-layout-parity.test.js`
- any follow-up `PreviewShellCore` implementation ticket that depends on the baseline
