# Export fallback lane boundary policy

Updated: 2026-04-21（T-20260420-091: lane 撤去後の文言整合）
Owner: Maintainer
Audience: PM, Developer, Reviewer
Review cadence: per change

## Goal

Define the policy boundary for **HTML document `compatibilityCss` append behavior** (and historically: “fallback-only” export CSS) so duplication can be removed in a controlled order. **HtmlExporter no longer has a second runtime lane** (`T-20260420-001`); this memo still guides **selector families** that may appear when callers pass **`compatibilityCss`** into `buildHtmlDocument`.

## Inputs

- [export-webview-css-duplication-inventory.md](export-webview-css-duplication-inventory.md)
- [html-exporter-primary-fallback-inventory.md](html-exporter-primary-fallback-inventory.md)
- [exporter-boundary-guide.md](exporter-boundary-guide.md)

## Scope

- Covers **compatibility-oriented selector families** that may be supplied via **`buildHtmlDocument(..., { compatibilityCss })`** (the old `getFallbackCompatibilityStyleBlock()` / `buildFallbackCompatibilityStyleBlock` helpers were **removed** in `T-20260420-001`; see `t028`).
- Sets the current policy for permanent compatibility, temporary compatibility, and delete-candidate classification.
- Provides sequencing guidance for `B3` and `B4`.

## Out of scope here

- Any runtime entrypoint changes.
- Any utility-lane cleanup in `getExportCriticalLayoutUtilities()`.
- Any selector removal or CSS reduction implementation.

## Classification model

| Class | Meaning | Allowed action in this slice |
|------|---------|-------------------------------|
| Permanent compatibility | Keep indefinitely because a **document-level compatibility CSS** contract still needs a stable boundary with no planned removal path. | None approved in this memo. |
| Temporary compatibility | Keep for now because **append-only compatibility CSS** may still be injected via `compatibilityCss`, but plan for removal after the standard `webviewCss` path is strengthened. | Record, isolate, and remove in later narrow implementation slices. |
| Delete candidate | No longer justified by the approved fallback routes or tests. | Mark for later removal, but do not delete in this policy slice. |

## Current boundary decision

### Permanent compatibility

None approved yet.

Rationale:

- The current evidence shows an explicit compatibility lane, not a long-term product lane.
- Declaring any selector family permanent before `B3` would freeze debt too early.

### Temporary compatibility

These selector families stay temporarily allowed because they are isolated to **append-only `compatibilityCss`** usage (tests / narrow tooling) and still map to the inventories in **`t028`** / **`html-exporter-primary-fallback-inventory.md`**.

#### Badge family

- `.textui-badge`
- `.textui-badge-sm`
- `.textui-badge-md`
- `.textui-badge-default`
- `.textui-badge-primary`
- `.textui-badge-success`
- `.textui-badge-warning`
- `.textui-badge-error`

#### Divider family

- `.textui-divider`
- `.textui-divider.vertical`

#### Progress family

- `.textui-progress`
- `.textui-progress-header`
- `.textui-progress-track`
- `.textui-progress-fill`
- `.textui-progress-default`
- `.textui-progress-primary`
- `.textui-progress-success`
- `.textui-progress-warning`
- `.textui-progress-error`

#### Tabs fallback shell

- `.textui-tabs`
- `.textui-tabs .flex`
- `.textui-tabs .flex > button`
- `.textui-tabs .flex > button:last-child`
- `.textui-tabs .flex > button.textui-tab-active`

Rationale:

- These families are already duplicated against WebView-side canonical CSS.
- They still serve **append-only compatibility CSS** and are **not** part of the Primary default `<style>` block from `buildHtmlDocument` without an explicit `compatibilityCss` argument.
- Removing them before `B3` would mix boundary-setting with runtime convergence and make regressions harder to judge.

### Delete candidates

None approved in this memo-only slice.

Rationale:

- The current inventories justify a narrow temporary lane, but not immediate deletion.
- Actual removal belongs to follow-up implementation tickets after route and test evidence is rechecked.

## Migration order

1. Keep **append-only compatibility CSS** isolated as temporary compatibility only (no second HtmlExporter runtime lane).
2. In `B3`, strengthen `readWebviewCssIfPresent()` as the standard path so missing-WebView-CSS cases are the only normal reason to append fallback compatibility CSS.
3. Remove temporary selector families in narrow follow-up slices once the route and regression evidence shows they are no longer needed.
4. Only after the fallback family boundary is reduced should `B4` touch shared utility cleanup in `getExportCriticalLayoutUtilities()`.

## Route and risk notes

| Topic | Risk | Why |
|------|------|-----|
| Primary lane regression | High | Primary export is the public default and must stay the source of truth. |
| `compatibilityCss` append regressions | Medium | Slot remains for tests; misuse could reintroduce “shadow styling” outside WebView SSoT. |
| Utility cleanup before fallback boundary is fixed | High | Mixing utility reduction with compatibility-boundary decisions makes drift hard to attribute. |
| Declaring a family permanent too early | Medium | It would normalize temporary duplication without route-level evidence. |

## Decision rules for later tickets

1. Do not move any selector family into permanent compatibility without a new approved ticket and explicit route evidence.
2. Do not delete temporary compatibility CSS in the same ticket that changes the policy itself.
3. Keep Primary default CSS minimal; compatibility selectors stay **append-only** (`compatibilityCss`) until removed.
4. If a selector family no longer appears in **approved** `compatibilityCss` / builder tests, reclassify it to delete candidate before implementation.

## T-028 compatibility CSS reduction matrix

ルール単位の列挙・分類・削除順・削除候補の正本: [t028-fallback-compatibility-css-reduction-matrix.md](./t028-fallback-compatibility-css-reduction-matrix.md)。

## B3 / B4 input

- `B3` should use this memo to decide which compatibility families may remain while standardizing `readWebviewCssIfPresent()`.
- `B4` should not start from utility cleanup first; it should consume the reduced selector boundary that remains after `B3`.
