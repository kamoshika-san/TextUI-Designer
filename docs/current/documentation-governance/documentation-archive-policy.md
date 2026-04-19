# Documentation Archive Policy

Updated: 2026-03-28
Owner: Maintainer
Audience: Maintainer, Reviewer, PM, TM
Review cadence: monthly

## Goal

Define how old docs move out of the live reader path while still preserving replacement links or historical-only context.

## Archive Placement Rule

- Archived documentation lives under `docs/archive/`.
- Move a page to `docs/archive/` only after its state is explicitly classified as `historical` or `superseded`.
- Keep current canonical and supporting pages outside `docs/archive/`.
- Do not move active workflow, setup, testing, or runtime-boundary pages into `docs/archive/`.

## When A Page Is Ready For Archive

Before archiving a page, capture all of the following in the archived page itself:

- state: `historical` or `superseded`
- reason the page left the live path
- replacement page, or explicit `historical only` note
- last meaningful update date
- owner for future questions

If any of those are missing, the page is not archive-ready.

## Replacement And Redirect Rule

- A superseded page must point to the replacement page in the first visible section.
- A historical page must say that it is retained for context only and whether a current operational replacement exists.
- A cross-link alone is not enough; the state change must be stated explicitly.
- The replacement link should point to the current canonical destination, not to another historical page.

## Archive Note Template

Use this note at the top of an archived page and fill in the placeholders:

```md
> Status: historical
> Updated: YYYY-MM-DD
> Owner: Maintainer
> Reason: kept for historical context after <replacement or decision>
> Replacement: [Current Page](../current-page.md)
```

If there is no replacement page, use:

```md
> Status: historical
> Updated: YYYY-MM-DD
> Owner: Maintainer
> Reason: retained for historical context only
> Replacement: historical only
```

## Archive Landing Page

- `docs/archive/README.md` is the landing page for archived material.
- It should explain that archived pages are not part of the default reader path.
- It should point readers back to current canonical destinations such as `README.md`, `CONTRIBUTING.md`, and `docs/current/workflow-onboarding/SETUP.md`.

## Current Archive Candidates

The historical-note family already identified by the inventory is the first archive candidate set:

- release notes
- sprint closeout notes
- spike notes
- superseded renderer / SSoT planning notes

Those pages should move only after each one carries the required archive note.

## Operational Rule

When a doc rewrite or consolidation replaces a page:

1. choose the new canonical destination
2. update the old page with the archive note
3. move the old page into `docs/archive/`
4. ensure the canonical page does not link readers back into archive for routine flow

## Out Of Scope Here

- bulk-moving the historical family in this slice
- rewriting release notes
- changing current canonical page content beyond narrow archive references
