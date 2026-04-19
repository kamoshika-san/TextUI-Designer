# Modal Export Parity Spec

This note fixes the Modal exporter contract for React and Pug by treating the current HTML exporter implementation as the baseline.

## Scope

This spec covers:

- `open`
- `title`
- `body`
- `actions`
- `action.kind`

This spec does not define visual polish beyond what is needed to preserve meaning and structure across exporters.

## Baseline Rule

When HTML, React, and Pug need different syntax, preserve behavior in this priority order:

1. Structure
2. Meaning
3. Appearance

Equivalent structure and semantics matter more than matching exact class names or inline style shape.

## Modal Root

- `open: false` must produce no Modal output.
- `open` omitted must be treated as `true`.
- `token` may flow through each exporter's existing styling mechanism, but token plumbing must not change the structural rules below.

## Title

- `title` present and non-empty: render a dedicated title/header section.
- `title` omitted or empty: do not render an empty header wrapper.

## Body

- `body` present and non-empty: render a dedicated body/content section.
- `body` omitted or empty: do not render an empty body wrapper.
- Body text must be escaped using the exporter's existing escaping rules for user-authored text.

## Actions

- `actions` omitted: render no footer/actions section.
- `actions: []`: render no footer/actions section.
- `actions` present with one or more items: render a footer/actions section containing the actions in authored order.
- Action labels must be escaped using the exporter's existing escaping rules for button-like text.

## Action Kind

- Supported kinds: `primary`, `secondary`, `danger`, `ghost`.
- `kind` omitted: treat as `secondary`.
- Unknown `kind` values must fall back to the same output mapping as `secondary` rather than failing or emitting a structurally different action.

## Exporter Parity Expectations

React and Pug must match the HTML baseline on these points:

- no output when `open: false`
- no empty header/body/footer wrappers
- authored action order is preserved
- omitted `kind` behaves as `secondary`
- `danger` and `ghost` remain distinct from the default/secondary lane in the exporter-specific output
- text content is escaped, not injected raw

## Sample Alignment

`sample/09-modal` already demonstrates:

- `danger`
- `ghost`
- `primary`
- `secondary`
- `open: false`

Implementation and regression tickets may add narrower edge fixtures for omitted `kind`, omitted `actions`, and empty `title` / `body`, but they should not reinterpret the rules above.
