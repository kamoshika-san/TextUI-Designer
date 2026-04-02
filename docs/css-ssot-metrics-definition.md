# CSS SSoT Metrics Definition

Updated: 2026-03-28
Owner: Maintainer
Audience: Maintainer, PM, Reviewer
Review cadence: per change

## Goal

Define one reviewable metric vocabulary for CSS source-of-truth work so future PR checks and CI gates can detect regression without reopening counting rules each time.

## Use With

- [export-webview-css-duplication-inventory.md](export-webview-css-duplication-inventory.md)
- [export-fallback-lane-boundary-policy.md](export-fallback-lane-boundary-policy.md)
- [html-exporter-primary-fallback-inventory.md](html-exporter-primary-fallback-inventory.md)

## Scope

This page defines only the metric vocabulary and current snapshot for Epic G.

It does not:

- implement a script
- add a CI gate
- rewrite component CSS
- change fallback-lane behavior

## Metric Set

| Metric | What it measures | Current snapshot | Target direction |
| --- | --- | --- | --- |
| TODO partial count | number of remaining component-layer partial implementations still explicitly marked as unfinished in the WebView canonical CSS migration scope | `0` | down |
| Non-exempt inline utility class occurrences | number of built-in renderer component `className` lines that still encode presentational utility responsibility instead of relying on canonical `.textui-*` selectors | `6` | down |
| Fallback compatibility selector count | number of selectors still defined in the append-only fallback compatibility CSS block in `html-template-builder.ts` | `24` | down |

## Counting Rules

### 1. TODO partial count

Count explicit unfinished partial markers in the current WebView canonicalization scope:

- `src/renderer/components/styles/*`
- matching built-in component TSX files when the file itself still declares the partial state

Count:

- files or markers that explicitly say the CSS migration for that component is still partial or TODO

Do not count:

- historical notes in docs
- backlog tickets
- generic code comments that do not mark an unfinished component CSS migration

Current interpretation on `2026-03-28`:

- Epic E completed Accordion, Tabs, Table, and Spacer partial work
- no current TODO-partial markers remain in the component-layer CSS migration scope

### 2. Non-exempt inline utility class occurrences

Count line-level occurrences in built-in renderer components under:

- `src/renderer/components/*.tsx`

Count only lines where:

- a `className="..."` string contains presentational utility tokens such as `text-*`, `border-*`, `px-*`, `py-*`, `mb-*`, `space-*`, `flex`, `items-*`, or similar utility-style classes
- the line belongs to a built-in component path that should eventually prefer canonical `.textui-*` selectors

Do not count:

- non-built-in renderer tooling UI such as theme controls or export buttons
- lines that use only canonical `.textui-*` classes
- intentionally local diagnostic or invalid-state fallback blocks that are not part of the normal component presentation contract

Current snapshot on `2026-04-02`:

- `Checkbox.tsx`: `0` (was `2` — replaced with `.textui-checkbox-wrapper` / `.textui-checkbox-label`)
- `Form.tsx`: `0` (was `1` — dead commented-out code removed)
- `Input.tsx`: `0` (was `2` — replaced with `.textui-input-wrapper`; broken `.textui-input label` selector fixed to `.textui-input-wrapper label`)
- `Radio.tsx`: `0` (was `1` — group label now styled via `.textui-radio-group > label` CSS rule)
- total: `0`

Current excluded example:

- the warning fallback block in `Table.tsx` stays out of this metric because it is a local invalid-state message rather than the canonical table presentation path

### 3. Fallback compatibility selector count

Count selectors defined inside the append-only fallback compatibility CSS block in:

- `src/exporters/html-template-builder.ts`

Count:

- each selector header in `getFallbackCompatibilityStyleBlock()`

Do not count:

- selectors from the Primary default export style block
- shared export utility selectors from `getExportCriticalLayoutUtilities()`
- WebView component CSS selectors

Current snapshot on `2026-03-28`:

- Badge family: `8`
- Divider family: `2`
- Tabs fallback shell: `5`
- Progress family: `9`
- total: `24`

## Current Snapshot Summary

Use this snapshot as the baseline for later PR comparison until a follow-up ticket updates the metric definition itself.

| Metric | Baseline on 2026-03-28 | Updated on 2026-04-02 |
| --- | --- | --- |
| TODO partial count | `0` | `0` |
| Non-exempt inline utility class occurrences | `6` | `0` |
| Fallback compatibility selector count | `24` | `24` |

## How A Future Gate Should Consume This

A later script or CI job should:

1. collect the three metrics using these counting rules exactly
2. compare the PR branch values against the current baseline or against the target threshold
3. fail only when the metric regresses beyond the approved rule for that gate

The gate should not redefine:

- which files are in scope
- which inline utility cases are exempt
- whether fallback compatibility selectors and shared export utilities are separate metrics

## Review Notes

- Keep the metric vocabulary narrow and mechanical.
- Prefer counts that can be explained from source files over composite scores.
- Update this page only when the counting rule changes, not every time the measured values move.

## Out Of Scope Here

- automation
- CI implementation
- PR template wording
- component CSS rewrites
