# HtmlExporter: Primary-only inventory (post-fallback removal)

**Status (2026-04-21, Vault T-20260420-091)**: The HtmlExporter **string-renderer compatibility (“fallback”) lane** is **removed** (`T-20260420-090` / `T-20260420-001`). Public HTML export is **Primary (React static) only**; `useReactRender: false` is rejected with **`[HtmlExporter:FALLBACK_REMOVED]`**.

**How to read this page**: This file keeps a **short current map** plus an **archived** pre-removal lane summary for ticket archaeology. Do not treat strikethrough / “Archive” sections as runtime truth.

**Current sources of truth**

- Runtime + structure: [`html-exporter-primary-structure-inventory.md`](./html-exporter-primary-structure-inventory.md)
- Boundary narrative: [`../runtime-boundaries/exporter-boundary-guide.md`](../runtime-boundaries/exporter-boundary-guide.md)
- Removal criteria / checklist history: [`t021-fallback-removal-criteria.md`](./t021-fallback-removal-criteria.md)

## Current model (2026-04 onward)

| Topic | State |
|------|--------|
| HtmlExporter export route | `renderPageComponentsToStaticHtml` → `buildHtmlDocument(..., { noWrap: true })` only |
| `ExportOptions.useReactRender` | Only meaningful value on supported paths: **true / omitted**; **`false` is rejected** |
| `buildHtmlDocument` | Still supports an optional **`compatibilityCss`** string slot for **document-level** tests and narrow tooling (not a second HtmlExporter runtime lane) |
| Tests for document CSS | `tests/unit/html-exporter-fallback-style-lane.test.js` exercises **`buildHtmlDocument` + `compatibilityCss`** only (filename keeps “fallback” for history; see `t016`) |
| Route / literal guards | `tests/unit/html-exporter-route-viability.test.js` (Primary defaults + **`src/**` must not contain `useReactRender: false`**) |

## Removed artifacts (do not resurrect in docs)

The following existed **before** `T-20260420-001` and are **gone from the tree**; grep hits in **non-archive** prose should be treated as a doc bug:

- `tests/unit/html-exporter-lane-observability.test.js`
- `tests/unit/html-exporter-fallback-structured-log.test.js`
- `tests/helpers/fallback-helper.js` and `createFallbackOptions(...)`
- `src/exporters/internal/fallback-lane-options.ts`, `fallback-access.ts`
- `withExplicitFallbackHtmlExport(...)` and `TEXTUI_HTML_EXPORTER_FALLBACK_LANE_EVENT_ID` logging inside HtmlExporter

## Archive: lane summary (pre-2026-04-20 removal)

This table described the **old** two-lane HtmlExporter. It is kept only so historical tickets (`t010`, `t016`, HR1) remain intelligible.

| Lane (removed) | Condition (removed) | Render path (removed) |
|------|-----------|-------------|
| **Primary** | `useReactRender !== false` (default) | `renderPageComponentsToStaticHtml` -> `buildHtmlDocument(..., { noWrap: true })` |
| **Fallback** | `useReactRender === false` via helper | legacy string renderer stack -> `buildHtmlDocument` |

## Owner / trigger / follow-up (current)

| Item | Notes |
|------|--------|
| Primary owner | `src/exporters/react-static-export.ts`, `src/renderer/component-map.tsx`, `src/exporters/html-exporter.ts` |
| Document builder | `src/exporters/html-template-builder.ts` (`compatibilityCss` slot for tests / templates) |
| Follow-up | Treat drift on **built-in html provider** or **preview capture** as **Primary** bugs first |

## T-350 classification (updated snapshot)

| Topic | Current state | Classification |
|---|---|---|
| Primary render stack | React static HTML export | **source of truth** |
| Legacy string renderer stack | Still present for **other exporters** (`ReactExporter` / `PugExporter` via `BaseComponentRenderer`); **not** used by `HtmlExporter` | **intended separation** (see `base-component-renderer-consumers.md`) |
| `compatibilityCss` append slot | Optional string on `buildHtmlDocument` | **test / tooling hook**, not a second product lane |
| Filename `html-exporter-fallback-style-lane.test.js` | Tests **builder** contracts only | **historical name**; behavior is Primary/document-level |

## Semantic contract migration (unchanged references)

Component-level Primary tests listed in the previous revision remain valid; the “Fallback coverage” column was about the removed lane. For current matrices, prefer **`t021`** + **`t028`**.

| Topic | Primary coverage | Notes |
|-------|------------------|-------|
| Tabs — list / tab / active / panel | `html-exporter-primary-tabs-semantic.test.js` | T-023 |
| Tabs + Divider composite | `html-exporter-primary-tabs-divider-composite.test.js` | T-033 |
| Table — semantic hooks | `html-exporter-primary-table-semantic.test.js` | T-030 |
| FormControl — Input / remaining | `html-exporter-primary-formcontrol-input.test.js`, `html-exporter-primary-formcontrol-remaining.test.js` | T-025 / T-034 |
| Alert — variant hooks | `html-exporter-primary-alert-variant.test.js` | T-031 |
| compatibility CSS reduction history | WebView SSoT + `t028` matrix | `buildFallbackCompatibilityStyleBlock` **removed**; see `t028` header |

## Related documents

- [`html-exporter-fallback-shrink-t010.md`](./html-exporter-fallback-shrink-t010.md) (phase-1 history)
- [`t028-fallback-compatibility-css-reduction-matrix.md`](./t028-fallback-compatibility-css-reduction-matrix.md)
- [`exporter-boundary-guide.md`](../runtime-boundaries/exporter-boundary-guide.md)
- [`export-fallback-lane-boundary-policy.md`](./export-fallback-lane-boundary-policy.md) (CSS policy; lane wording updated in T-091)
- [`export-webview-runtime-coupling-inventory.md`](../runtime-boundaries/export-webview-runtime-coupling-inventory.md)
