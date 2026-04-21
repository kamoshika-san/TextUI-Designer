# Export Contract

This document fixes the external contract for export callers. Internal pipeline modules may change as long as this contract holds.

## Inputs

| Input | Contract |
|---|---|
| DSL | `TextUIDSL` for page exports; `NavigationFlowDSL` for flow exports. |
| Format | `ExportOptions.format` selects a registered exporter. Unsupported formats throw. |
| Output path | Optional. Used for local asset copy and caller-side file writing. |
| Source path | Optional but required for include resolution and incremental snapshot identity. |
| Theme path | Optional theme definition consumed by exporters that support theme styles. |
| `useReactRender` | HTML only. Omitted/`true` means primary path; `false` is unsupported and throws. |
| Incremental route options | Internal optimization hints. They must not change final export content. |

## Outputs

All exporters return a `Promise<string>`.

| Format Family | Output |
|---|---|
| `html` | Full HTML document. |
| `react` / `vue` / `svelte` / `pug` | Framework/source file text. |
| `*-flow` | Flow-oriented source output for navigation DSL. |

## Errors

- Unsupported format: throw `Unsupported export format: <format>`.
- Wrong DSL family: exporter-specific error, for example `html` rejects navigation flow DSL and points to `html-flow`.
- Removed compatibility route: `HtmlExporter` throws `[HtmlExporter:FALLBACK_REMOVED]`.
- I/O or include failures: surface as export failure with the original message preserved where possible.

## Stability Rules

- CLI, MCP, and VS Code callers may depend on `ExportManager`, provider registry outputs, and the `Exporter` interface.
- Callers must not import private renderer helpers, `legacy/**`, or format-specific internals to bypass the manager.
- Pipeline caching, metrics, and incremental rendering are implementation details.
- Internal layer compression must preserve output strings for representative golden tests.

