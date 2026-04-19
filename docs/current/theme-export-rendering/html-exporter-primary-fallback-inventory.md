# HtmlExporter: primary / fallback inventory

**Purpose**: keep the meaning of `ExportOptions.useReactRender` on one page so changes can be judged against a single source of truth.
**Source of truth**: `src/exporters/html-exporter.ts` and [exporter-boundary-guide.md](exporter-boundary-guide.md).
**How to read this page**: fallback is a compatibility lane, not the default design target. This inventory records owner, trigger, follow-up, and route viability.
**Removal gate**: when planning to delete the lane, use [t021-fallback-removal-criteria.md](./t021-fallback-removal-criteria.md).

## Lane summary

| Lane | Condition | Render path |
|------|-----------|-------------|
| **Primary** | `useReactRender !== false` (default) | `renderPageComponentsToStaticHtml` -> `buildHtmlDocument(..., { noWrap: true })` |
| **Fallback** | `useReactRender === false` via `withExplicitFallbackHtmlExport(...)` | `renderPageComponents` (`BaseComponentRenderer` + `html-renderers/*`) -> `buildHtmlDocument` |

## Owner / Trigger / Follow-up

| Item | Primary | Fallback |
|------|---------|----------|
| **owner** | `src/exporters/react-static-export.ts` and `src/renderer/component-map.tsx` | `src/exporters/legacy/base-component-renderer.ts` and `src/exporters/legacy/html-renderers/*` |
| **trigger** | normal HTML export, built-in `html` provider, preview preparation | explicit helper-routed fallback for capture, compatibility regression, or legacy behavior checks |
| **follow-up** | treat drift as work against the main renderer contract | require a reason, keep Primary as source of truth, and record the reason in code comments or review handoff |

## Current route inventory

| Route | Current entry | Lane |
|------|---------------|------|
| `src/cli/provider-registry.ts` built-in `html` provider | `useReactRender: true` | **Primary** |
| `src/utils/preview-capture/html-preparation.ts` | `options.useReactRender ?? true` | default is **Primary**, explicit override only |
| `src/cli/commands/capture-command.ts` | （オプション未指定 → `prepareCaptureArtifacts` の `useReactRender ?? true`） | **Primary**（T-010） |
| fallback-focused unit tests such as `tests/unit/html-exporter-lane-observability.test.js` | `withExplicitFallbackHtmlExport(...)` or explicit deprecation-boundary requests | **Fallback** |

## Observability

- `src/exporters/html-exporter.ts` emits a **structured debug** log on the fallback lane only (`TEXTUI_HTML_EXPORTER_FALLBACK_LANE_EVENT_ID` = `textui.html_exporter.fallback_lane`, payload `lane` / `ticket: T-022`). Set **`TEXTUI_LOG_LEVEL=debug`** to observe.
- Raw public `useReactRender: false` requests also emit a deprecation warning; helper-routed internal fallback stays warning-free.
- The Primary lane stays quiet. Use `TEXTUI_LOG_LEVEL=debug` only when fallback usage needs to be observed.

## Current measurement snapshot (T-20260327-055)

Rerun command:

```bash
npm run report:react-fallback-usage
```

Current snapshot on `2026-03-27` (pre-T-010):

| Metric | Value | Notes |
|---|---|---|
| runtime fallback entries | `1` | ~~isolated to `src/cli/commands/capture-command.ts`~~ **removed in T-010** (CLI capture now Primary-default) |

Post-T-010 snapshot (rerun `npm run report:react-fallback-usage`):

| Metric | Value | Notes |
|---|---|---|
| runtime fallback entries | `0` | no production runtime file lists an explicit fallback entry; compatibility lane remains for tests via `withExplicitFallbackHtmlExport` |
| fallback helper definitions | `1` | helper stays centralized in `src/exporters/internal/fallback-lane-options.ts` (T-020) |
| primary-default routes | `2` | built-in HTML provider and preview-capture preparation remain Primary by default |
| fallback execution test files | `2` | compatibility lane remains covered only by explicit fallback-lane observability and style-lane tests |
| fallback governance files | `4` | guard, route-viability, taxonomy, and this inventory page document the lane |

Lane ownership in the current snapshot:

- CLI `capture` export lane: **Primary** (`src/cli/commands/capture-command.ts`, T-010)
- Fallback helper owner: `src/exporters/internal/fallback-lane-options.ts` (`fallback-access.ts` facade)
- Primary-default routes: `src/cli/provider-registry.ts`, `src/utils/preview-capture/html-preparation.ts`
- Fallback execution test lane:
  - `tests/unit/html-exporter-lane-observability.test.js`
  - `tests/unit/html-exporter-fallback-style-lane.test.js`

## Difference categories

Use these labels when a behavior difference is found.

| # | Difference | Primary | Fallback | Classification | Notes |
|---|------------|---------|----------|----------------|-------|
| 1 | HTML document wrapper | `buildHtmlDocument(..., { noWrap: true })` | wrapper path differs | intended difference | locked in `html-exporter.ts` |
| 2 | Markup rendering stack | React static render | legacy string renderer stack | intended difference | Primary is the design target for new work |
| 3 | Component support expansion | new support should land here first | may lag or remain compatibility-only | compatibility lane | if fallback needs bespoke work, record why |
| 4 | Theme / `webviewCss` handling | carried through the main document build; default document CSS stays minimal when `webviewCss` is absent | route-specific; fallback-only compatibility CSS may be appended explicitly | intended but narrow | judge against current runtime behavior |
| 5 | CLI / test usage | provider export is Primary by default | **CLI capture is Primary-default (T-010)**; explicit compatibility tests still use fallback | intended and documented | do not silently widen fallback entry points |
| 6 | Small DOM differences | evaluate case by case | evaluate case by case | investigate individually | open an issue or extend this table when found |

## T-350 classification

This is the current separation between intentional differences, acceptable temporary debt, and unresolved mismatch.

| Topic | Current state | Classification | Why |
|---|---|---|---|
| Primary render stack vs legacy string renderer stack | Two rendering stacks still exist | intended difference | HR1 fixed Primary as the source of truth without claiming same-sprint fallback removal |
| Built-in HTML provider and preview preparation | Default to Primary | intended difference | These are now the normal product-facing routes and should stay Primary-first |
| CLI capture forcing fallback via helper | Removed (T-010) | resolved toward Primary | Capture preparation already defaulted to Primary; the extra helper wrap only duplicated the compatibility lane |
| Fallback-focused regression tests | Only explicit fallback-lane observability/style coverage remains | acceptable temporary debt | General regression coverage moved back to the React-primary contract |
| Fallback-only compatibility CSS | Isolated to the fallback lane append path in `html-template-builder` | acceptable temporary debt | Primary default no longer carries badge / tabs / progress compatibility CSS unless the fallback lane asks for it |
| Fallback-only code comments / handoff justification | Required for any new fallback-only change | acceptable temporary debt | This keeps compatibility fixes reviewable instead of allowing silent lane drift |
| Normal export path behaving differently from Primary documentation | Not observed in current HR1 evidence | unresolved mismatch: none observed | Treat any future reproduction here as a new Primary-path bug first |
| New raw fallback entrypoints outside the approved helper | Blocked by guard | unresolved mismatch: none observed | `html-exporter-route-viability.test.js`（fallback entry guard describe）が機械保証 |

## Route viability snapshot (HR1-S3 / T-352)

This separates routes that are already safe to treat as Primary from routes that still need the compatibility lane.

| Route | Current entry | Classification | Why |
|---|---|---|---|
| Built-in HTML provider | `src/cli/provider-registry.ts` | Fully movable / already Primary | The built-in `html` provider explicitly passes `useReactRender: true`, so normal CLI export is already anchored to the Primary renderer. |
| Preview capture preparation | `src/utils/preview-capture/html-preparation.ts` | Fully movable / already Primary by default | `prepareCaptureArtifacts()` uses `options.useReactRender ?? true`, so preview HTML preparation already validates the Primary lane unless a caller asks for fallback on purpose. |
| Capture command | `src/cli/commands/capture-command.ts` | Fully movable / now Primary-default (T-010) | `capture` no longer wraps options with `withExplicitFallbackHtmlExport(...)`; `prepareCaptureArtifacts` already defaulted to Primary (`useReactRender ?? true`). |
| Fallback-focused regression tests | `tests/unit/*` with explicit fallback setup | Partial difference | These tests protect compatibility behavior and should remain fallback-specific even while production and default routes converge on Primary. |

Small-slice verification in `tests/unit/html-exporter-route-viability.test.js` locks the built-in provider, preview preparation, and **CLI capture** as Primary-default (T-010 updated the capture expectation).

`T-20260328-097` adds one more guard on the Primary-first CSS path: when an explicit `extensionPath` does not contain `media/assets/index-*.css`, Export now falls back to the local built WebView assets before treating the route as a missing-WebView-CSS case.

## Decision rules

1. If drift reproduces on normal export, provider output, or preview preparation, treat it as a **Primary** issue first.
2. If drift reproduces on **CLI `capture`**, treat it as a **Primary** issue first (T-010). If drift reproduces only on **helper-routed fallback tests**, treat it as a documented fallback compatibility issue.
3. When fallback-specific code is changed, keep Primary as the source of truth and leave a short reason in code comments or the review handoff.
4. If a difference is still isolated to the explicit fallback lane and has a named guard, classify it as acceptable temporary debt rather than as a hidden mismatch.
5. If a difference affects Primary-default routes or requires a new unapproved fallback entrypoint, classify it as an unresolved mismatch and open follow-up work.

## Semantic contract migration (T-023 / T-025 / T-028)

| Topic | Primary coverage | Fallback coverage | Notes |
|-------|------------------|-------------------|-------|
| Tabs — list / tab / active / panel | `tests/unit/html-exporter-primary-tabs-semantic.test.js` | `html-exporter-fallback-style-lane.test.js`（`Tabs+Divider` シナリオ） | Primary は `textui-tab is-active`。fallback はレガシー `textui-tab-active is-active` 等を継続。 |
| Table — semantic hooks | `tests/unit/html-exporter-primary-table-semantic.test.js` | — | T-030: Primary のみで `textui-table*` + hover/striped トークンを検証。fallback から Table assert 除去。 |
| FormControl — Input | `tests/unit/html-exporter-primary-formcontrol-input.test.js` | 複合 DSL 内の Input ノードは残すが **`textui-input` の単体 assert は Primary に移管** | Checkbox / Radio / DatePicker は当面 fallback のみ。 |
| FormControl — 残件（T-025） | — | `html-exporter-fallback-style-lane.test.js` の FormControl `it` | **Checkbox / Radio / DatePicker**: レガシー `html-form-renderer` はラベル行・Tailwind 連結クラスが React の `Input` 等と一致せず、**同一文字列 assert を Primary に複製すると誤検知**になりやすい。次スプリントで意味対応表を切ってから移管。 |
| Alert — variant hooks | `tests/unit/html-exporter-primary-alert-variant.test.js` | — | T-031: `data-alert-variant` + `textui-alert` 系を Primary で検証。 |
| compatibility CSS 削減計画 | WebView / `Button.css` の `.textui-button.submit` は維持 | `buildFallbackCompatibilityStyleBlock`（**T-032**: `.textui-button.submit` 重複ルール削除済み） | 正本: [t028-fallback-compatibility-css-reduction-matrix.md](./t028-fallback-compatibility-css-reduction-matrix.md)。 |

## Related documents

- [html-exporter-fallback-shrink-t010.md](html-exporter-fallback-shrink-t010.md)（T-010 縮小フェーズ 1・分類と計測手順）
- [t028-fallback-compatibility-css-reduction-matrix.md](./t028-fallback-compatibility-css-reduction-matrix.md)
- [exporter-boundary-guide.md](exporter-boundary-guide.md)
- [export-fallback-lane-boundary-policy.md](export-fallback-lane-boundary-policy.md)
- [export-webview-runtime-coupling-inventory.md](export-webview-runtime-coupling-inventory.md)
- `tests/unit/shared-kernel-preview-export-parity.test.js`
