# SSoT Exception Log Rules

Updated: 2026-03-27

## Goal

State how temporary SSoT exceptions must be recorded during Epic A so "new reference prohibited" stays enforceable in review, not just in code.

## Applies To

- `renderer/types`
- SSoT guard suppression
- temporary lint suppression around SSoT boundaries
- temporary metrics threshold handling

## Required Fields

If an exception is introduced or extended, record all of the following in the PR and review handoff:

| Field | Requirement |
|---|---|
| reason | Why the exception is necessary now |
| scope | Exact file, layer, or command affected |
| owner | Who owns the follow-up removal |
| parent ticket | The ticket that will remove the exception |
| removal deadline | A concrete date or a concrete close condition |

## Deadline Rule

- `later`, `follow-up`, or blank is not acceptable as a deadline.
- A valid deadline is either:
  - a calendar date, or
  - a concrete parent-ticket close condition such as `remove in T-20260327-027`

## Zero-Exception Default

- If no exception exists, record `none` explicitly.
- Do not leave the exception state implicit.

## Review Rule

- Do not approve a new SSoT exception without all five required fields.
- Do not approve an indefinite exception for `renderer/types`.

## Related

- [../.github/PULL_REQUEST_TEMPLATE.md](../.github/PULL_REQUEST_TEMPLATE.md)
- [ssot-renderer-types-zero-metrics-dashboard.md](./ssot-renderer-types-zero-metrics-dashboard.md)
- [adr/0003-dsl-types-canonical-source.md](./adr/0003-dsl-types-canonical-source.md)
