# Export vs WebView CSS Duplication Inventory

Last updated: 2026-03-28  
Owner: DEV1  
Audience: PM, Developer, Reviewer

## Scope

- WebView canonical surface:
  - `src/renderer/components/styles/*`
- Export-side CSS surface:
  - `src/shared/layout-styles.ts`
  - `src/exporters/html-template-builder.ts`

This inventory is selector-based. It does not propose implementation changes yet. It exists to anchor `B2` policy work and the later safe reduction slices in `B3` and `B4`.

## Duplicated Selectors

These selectors currently exist on both the WebView side and the Export side.

| Selector | WebView source | Export source | Notes | Priority |
| --- | --- | --- | --- | --- |
| `.textui-container` | `src/renderer/components/styles/Container.css` | `src/shared/layout-styles.ts` | Shared container baseline, but Export still carries its own width / padding / box-shadow contract. | High |
| `.textui-spacer` | `src/renderer/components/styles/Spacer.css` | `src/shared/layout-styles.ts` | Export still defines a partial baseline even after Spacer partial completion. | Medium |
| `.textui-table` | `src/renderer/components/styles/Table.css` | `src/shared/layout-styles.ts` | Export keeps a narrow table-layout rule while WebView now owns the richer table contract. | High |
| `.textui-tabs` | `src/renderer/components/styles/Tabs.css` | `src/exporters/html-template-builder.ts` | Fallback compatibility lane still carries a separate tabs shell. | High |
| `.textui-badge` | `src/renderer/components/styles/Badge.css` | `src/exporters/html-template-builder.ts` | Full badge baseline duplicated across lanes. | High |
| `.textui-badge-sm` | `src/renderer/components/styles/Badge.css` | `src/exporters/html-template-builder.ts` | Same size vocabulary exists in both lanes. | High |
| `.textui-badge-md` | `src/renderer/components/styles/Badge.css` | `src/exporters/html-template-builder.ts` | Same size vocabulary exists in both lanes. | High |
| `.textui-badge-default` | `src/renderer/components/styles/Badge.css` | `src/exporters/html-template-builder.ts` | Variant color contract duplicated. | High |
| `.textui-badge-primary` | `src/renderer/components/styles/Badge.css` | `src/exporters/html-template-builder.ts` | Variant color contract duplicated. | High |
| `.textui-badge-success` | `src/renderer/components/styles/Badge.css` | `src/exporters/html-template-builder.ts` | Variant color contract duplicated. | High |
| `.textui-badge-warning` | `src/renderer/components/styles/Badge.css` | `src/exporters/html-template-builder.ts` | Variant color contract duplicated. | High |
| `.textui-badge-error` | `src/renderer/components/styles/Badge.css` | `src/exporters/html-template-builder.ts` | Variant color contract duplicated. | High |
| `.textui-divider` | `src/renderer/components/styles/Divider.css` | `src/exporters/html-template-builder.ts` | Export fallback still defines both horizontal and vertical divider shapes. | High |
| `.textui-divider.vertical` | `src/renderer/components/styles/Divider.css` | `src/exporters/html-template-builder.ts` | Same vertical variant duplicated. | High |
| `.textui-progress` | `src/renderer/components/styles/Progress.css` | `src/exporters/html-template-builder.ts` | Full progress shell duplicated. | High |
| `.textui-progress-header` | `src/renderer/components/styles/Progress.css` | `src/exporters/html-template-builder.ts` | Header layout duplicated. | High |
| `.textui-progress-track` | `src/renderer/components/styles/Progress.css` | `src/exporters/html-template-builder.ts` | Track shell duplicated. | High |
| `.textui-progress-fill` | `src/renderer/components/styles/Progress.css` | `src/exporters/html-template-builder.ts` | Fill animation / shape duplicated. | High |
| `.textui-progress-default` | `src/renderer/components/styles/Progress.css` | `src/exporters/html-template-builder.ts` | Variant color contract duplicated. | High |
| `.textui-progress-primary` | `src/renderer/components/styles/Progress.css` | `src/exporters/html-template-builder.ts` | Variant color contract duplicated. | High |
| `.textui-progress-success` | `src/renderer/components/styles/Progress.css` | `src/exporters/html-template-builder.ts` | Variant color contract duplicated. | High |
| `.textui-progress-warning` | `src/renderer/components/styles/Progress.css` | `src/exporters/html-template-builder.ts` | Variant color contract duplicated. | High |
| `.textui-progress-error` | `src/renderer/components/styles/Progress.css` | `src/exporters/html-template-builder.ts` | Variant color contract duplicated. | High |

## WebView-Only Selectors

These selectors exist in the current WebView component CSS but not as CSS definitions in the Export-side style blocks.

### Tabs

- `.textui-tabs-list`
- `.textui-tab`
- `.textui-tab:last-child`
- `.textui-tab:hover:not(.is-disabled)`
- `.textui-tab.is-active`
- `.textui-tab.is-disabled`
- `.textui-tab:focus-visible`
- `.textui-tab-panel`
- `.textui-tab-panel-body`

### Table

- `.textui-table-container`
- `.textui-table-head`
- `.textui-table-header`
- `.textui-table-body`
- `.textui-table-row`
- `.textui-table-row.is-striped`
- `.textui-table-row.has-hover:hover`
- `.textui-table-cell`

### Spacer

- `.textui-spacer.axis-horizontal`
- `.textui-spacer.axis-vertical`

### Progress

- `.textui-progress-label`

### Divider / Container variants

- `.light .textui-divider`
- `.light .textui-divider.vertical`
- `.textui-container.flex.flex-row`

These are the places where WebView canonicalization has already moved ahead of Export and where future convergence should prefer reuse rather than recreating new Export-only rules.

## Export-Only Selectors

These selectors exist only in Export-side style blocks today.

### Shared utility lane in `src/shared/layout-styles.ts`

- `.flex`
- `.flex-row`
- `.flex-col`
- `.flex-wrap`
- `.min-w-full`
- `.overflow-x-auto`
- `.space-y-4 > * + *`
- `.space-x-4 > * + *`
- `.space-y-3 > * + *`
- `.gap-4`
- `.divide-y > * + *`
- `.divide-gray-700 > * + *`
- `.border`
- `.border-gray-700`
- `.border-gray-300`
- `.border-b`
- `.rounded-md`
- `.px-4`
- `.py-2`
- `.p-4`
- `.p-6`
- `.text-sm`
- `.text-left`
- `.font-semibold`
- `.font-medium`
- `.text-white`
- `.text-gray-100`
- `.text-gray-200`
- `.text-gray-300`
- `.text-gray-400`
- `.text-gray-700`
- `.text-gray-900`
- `.bg-gray-800`
- `.bg-gray-800\/70`
- `.bg-gray-900`
- `.bg-gray-100`
- `.bg-gray-200`
- `.align-top`
- `.min-h-screen`
- `.overflow-hidden`
- `.opacity-50`
- `.cursor-not-allowed`
- `.transition-colors`
- `.hover\:bg-gray-800\/80:hover`
- `.last\:border-r-0:last-child`
- `.my-2`
- `.my-4`
- `.my-6`
- `.mx-4`
- `.inline-block`
- `.light .textui-container`

### Fallback compatibility lane in `src/exporters/html-template-builder.ts`

- `.textui-tabs .flex`
- `.textui-tabs .flex > button`
- `.textui-tabs .flex > button:last-child`
- `.textui-tabs .flex > button.textui-tab-active`

These selectors are the main convergence target because they keep Export behavior alive without any matching canonical component-layer selector in WebView CSS.

## First-Pass Reduction Priority

### Priority 1: Fallback compatibility components

- `badge`
- `divider`
- `progress`
- `tabs`

Reason:
- They have clear duplicated selector families on both sides.
- ~~The Export copies live in `getFallbackCompatibilityStyleBlock()`~~ **Removed (`T-20260420-001`)**; duplication is now tracked against **WebView CSS SSoT** vs any **`compatibilityCss`** append usage (see `t028`).
- `B2` can decide which parts remain compatibility-only and which should disappear behind WebView CSS reuse.

### Priority 2: Shared layout overlap

- `.textui-container`
- `.textui-table`
- `.textui-spacer`

Reason:
- These selectors now have newer canonical implementations on the WebView side after Epic E.
- Export still carries a narrow baseline for them, so they are lower-risk candidates for shrinkage after the fallback policy is fixed.

### Priority 3: Export-only utility lane

- Tailwind-style utility selectors in `getExportCriticalLayoutUtilities()`

Reason:
- This lane is broad and still used by non-component markup paths in Export.
- It should be reduced only after the component-family overlap and fallback boundary are explicit.
- `B4` should treat this as a selective reduction lane, not an all-at-once delete.

## Recommended Next Inputs

- `B2`: use this inventory to classify selectors into `permanent compatibility`, `temporary compatibility`, and `delete candidate`.
- `B3`: use the Priority 1 and 2 clusters to define which selectors should disappear once `readWebviewCssIfPresent()` is the standard path.
- `B4`: use the Export-only utility list as the safe reduction backlog, starting with utilities no longer needed by the approved primary markup.
