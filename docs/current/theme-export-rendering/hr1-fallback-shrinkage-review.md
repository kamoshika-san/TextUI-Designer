# HR1 fallback shrinkage review

This note closes HR1 by separating what is already Primary, what remains an intentional compatibility lane, and what should move to the next epic.

## Scope reviewed

- HR1-S1 discovery and observability
- HR1-S2 Primary hardening
- HR1-S3 fallback isolation

## Achieved in HR1

| Area | Result | Evidence |
|---|---|---|
| Route inventory | Primary / Fallback entry points are listed in one place | `docs/current/theme-export-rendering/html-exporter-primary-fallback-inventory.md` |
| Fallback observability | fallback lane emits a dedicated debug log and stays quiet on Primary | `tests/unit/html-exporter-lane-observability.test.js` |
| Primary default path | built-in HTML provider and preview preparation are fixed to Primary by default | `src/cli/provider-registry.ts`, `src/utils/preview-capture/html-preparation.ts`, `tests/unit/html-exporter-route-viability.test.js` |
| Explicit fallback entry | CLI capture fallback is centralized behind a named helper | `src/exporters/html-export-lane-options.ts`, `src/cli/commands/capture-command.ts` |
| Fallback sprawl guard | raw `useReactRender: false` additions in `src/**` are blocked outside the approved helper | `tests/unit/html-exporter-fallback-entry-guard.test.js` |
| Primary-first guidance | maintainer and built-in authoring docs treat Primary as source of truth | `docs/current/runtime-boundaries/exporter-boundary-guide.md`, `docs/current/workflow-onboarding/adding-built-in-component.md`, `docs/current/operations/MAINTAINER_GUIDE.md` |

## Remaining compatibility lane

| Route / topic | Why it remains | Current rule |
|---|---|---|
| `capture-command` fallback entry | capture flow still depends on the explicit compatibility lane | keep helper-based entry and do not widen raw fallback literals |
| fallback-focused tests | these protect compatibility behavior rather than the default runtime contract | keep them explicit and named as fallback coverage |
| fallback-only fixes | some changes may still need the compatibility lane | leave a reason in a code comment, review handoff, or PR note |

## What HR1 did not complete

| Topic | Status | Why not in HR1 |
|---|---|---|
| Full fallback removal | not started | outside the epic goal; HR1 only isolated and documented the lane |
| Route-by-route migration of capture | not started | HR1 validated the route and kept it explicit instead of replacing it blindly |
| Next-epic sequencing | delegated | this review is input for `T-356` rather than the backlog split itself |

## Review conclusion

1. Primary is now the documented source of truth for normal HTML export, provider output, and preview preparation.
2. Fallback is narrowed to an explicit compatibility lane instead of a drifting alternate default.
3. Future fallback-only changes should justify themselves locally; otherwise they should be challenged as Primary-path work first.

## Input for next backlog split

- Treat capture-lane replacement as a separate decision from generic HtmlExporter maintenance.
- Keep `Primary parity / hardening` and `Fallback compatibility obligations` as separate ticket families.
- Prefer tickets that either remove one explicit fallback dependency or prove that it must remain for a documented reason.
