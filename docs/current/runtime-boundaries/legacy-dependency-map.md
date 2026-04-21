# Exporter Legacy Dependency Map

Status: complete for the exporter legacy removal wave started by `T-20260422-005`.

## Summary

The old HTML string-renderer compatibility lane is no longer a runtime dependency of `HtmlExporter`.
`HtmlExporter` is primary-only: it renders page components through `react-static-export`, and `useReactRender: false` is rejected with `[HtmlExporter:FALLBACK_REMOVED]`.

## Inventory

| Area | Status | Evidence |
|---|---|---|
| `HtmlExporter` runtime path | Primary only | `src/exporters/html-exporter.ts` imports `renderPageComponentsToStaticHtml` and rejects `useReactRender === false`. |
| `src/**` raw `useReactRender: false` entrypoints | Zero required | `tests/unit/html-exporter-route-viability.test.js` scans `src/**`. |
| Runtime fallback helper imports | Zero | `withExplicitFallbackHtmlExport`, `fallback-lane-options`, and `fallback-access` are absent from `src/**`. |
| `src/exporters/legacy/html-renderers/*` | Removed | No runtime exporter imports these files; `tests/unit/html-renderers-exporter-ssot-guard.test.js` now guards absence. |
| React / Pug exporter dependency on `BaseComponentRenderer` | Removed | `tests/unit/exporter-family-structure-regression.test.js` checks both exporters. |
| Fallback execution tests | Test-only | `tests/unit/html-exporter-primary-only-structure.test.js` and `html-exporter-route-viability.test.js` verify rejection and route hygiene. |

## Call Graph

Normal HTML export:

```text
CLI / VS Code / MCP caller
  -> ExportManager or provider registry
  -> HtmlExporter.export()
  -> renderPageComponentsToStaticHtml()
  -> buildHtmlDocument()
```

Removed compatibility request:

```text
HtmlExporter.export({ useReactRender: false })
  -> throws [HtmlExporter:FALLBACK_REMOVED]
```

Incremental export fallback terminology is separate. In `ExportManager`, a failed incremental route can fall back to a full render, but that full render still uses the same current exporter path. It is not the removed HtmlExporter string-renderer compatibility lane.

## Usage Measurement

Current `npm run report:react-fallback-usage` baseline:

```text
runtime fallback entries: 0
fallback helper definitions: 0
primary-default routes: 2
helper calls in runtime source: 0
```

Fallback usage rate for the removed HtmlExporter compatibility lane is therefore `0%` for production runtime entrypoints.

## Classification

| Reference Type | Classification | Action |
|---|---|---|
| `useReactRender: false` in tests | Test-only rejection coverage | Keep focused rejection tests. |
| `fallback` in visual diff / incremental rendering | Different domain terminology | Do not treat as exporter legacy debt. |
| Historical fallback docs under `docs/current/theme-export-rendering/` | Governance history | Keep as history unless a docs cleanup ticket decides otherwise. |
| `src/exporters/legacy/html-renderers/*` | Unreachable legacy code | Removed in the finish phase. |

