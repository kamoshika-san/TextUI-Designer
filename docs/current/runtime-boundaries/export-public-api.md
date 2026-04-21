# Export Public API Boundary

This page records the stable export entrypoints and the implementation details callers must avoid.

## Stable Entrypoints

| Caller | Stable Boundary | Notes |
|---|---|---|
| VS Code extension commands | `ExportManager` and service-level command bindings | Commands should not instantiate private renderer helpers. |
| CLI page export | `src/cli/provider-registry.ts` provider contract | HTML provider passes `useReactRender: true`. |
| CLI flow export | `Flow*Exporter` through flow command/provider selection | Use flow formats for `NavigationFlowDSL`. |
| MCP tools | Export service / provider entrypoints | Use the same public options shape as CLI. |
| Tests | Public exporter classes or `ExportManager` unless testing internals explicitly | Internal tests must state why they need internals. |

## Private Implementation

The following are not public API:

- `src/exporters/legacy/**`
- `src/exporters/internal/**`
- component renderer helper functions under format-specific implementation modules
- cache/diff/metrics pipeline internals
- incremental render target construction

## Breaking Change Rule

Changes are breaking when they alter:

- accepted DSL family for a public format;
- returned output type;
- supported format names;
- public error semantics listed in `export-contract.md`;
- CLI/MCP/VS Code route defaults.

Changes are normally non-breaking when they only:

- rename or remove unreachable internal helpers;
- simplify pipeline layering while preserving output;
- update tests or docs for private implementation details.

## Guard Expectations

- `npm run check:import-graph` should remain green.
- `npm run check:ssot:exporters` should catch exporter SSoT drift.
- HtmlExporter must remain primary-only and reject `useReactRender: false`.

