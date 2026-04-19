# React Primary Release Gate

Updated: 2026-03-28
Owner: Maintainer
Audience: Reviewer, Maintainer, PM, Contributor

This page defines the release-candidate acceptance checklist for the React-primary rendering contract.

## Goal

Keep the public Preview / Export path aligned on the React-primary source of truth and make release decisions from the current verification entrypoints instead of informal interpretation.

## Required Checks

Run or confirm all of the following for a release candidate:

1. `npm run react-ssot-check`
2. `npm run test:all:ci`
3. `npm run metrics:collect`
4. `npm run metrics:check:ssot`

## Acceptance Areas

### 1. Structure parity

Pass condition:

- `npm run react-ssot-check` stays green.
- Preview / Export DOM parity remains covered by:
  - `tests/unit/shared-kernel-preview-export-parity.test.js`

Interpretation:

- Normal product-facing Preview / Export behavior must still match the React shared-kernel contract.
- Drift on the normal export path is a Primary issue first, not a fallback issue.

### 2. Theme parity

Pass condition:

- `npm run react-ssot-check` stays green.
- Preview / Export theme variable parity remains covered by:
  - `tests/unit/react-theme-vars-preview-export-contract.test.js`

Interpretation:

- Preview remains the source of truth for theme variable meaning.
- Export must continue to use the same merged token and variable-map contract before CSS emission.

### 3. Representative sample coverage

Pass condition:

- `npm run test:all:ci` stays green.
- Representative sample expectations continue to be exercised through the current unit / regression lanes rather than by a separate ad hoc script.

Current evidence includes:

- unit sample regression coverage such as `tests/unit/html-exporter-primary-sample-regression.test.js`
- regression lane coverage through `npm run test:regression`

Interpretation:

- Sample-backed exporter expectations are part of the React-primary acceptance story.
- If a sample regression fails on the normal export path, treat it as a Primary-path release blocker.

### 4. SSoT guards

Pass condition:

- `npm run metrics:check:ssot` reports `status=PASS`
- `renderer/types imports = 0` remains true

Supporting commands and guards:

- `npm run metrics:collect`
- `npm run metrics:check:ssot`
- `npm run check:dsl-types-ssot`
- `npm run check:ssot:exporters`

Interpretation:

- `metrics:check:ssot` is the release gate.
- `check:dsl-types-ssot` and `check:ssot:*` explain where SSoT drift is coming from and should be used when triaging or reviewing a failing candidate.

## How The Checks Fit Together

| Check | Meaning in the gate |
|---|---|
| `react-ssot-check` | fail-fast proof of structure parity and theme parity on the React-primary path |
| `test:all:ci` | broad confidence that unit / integration / simulated e2e / regression lanes still pass together |
| `metrics:check:ssot` | release-blocking SSoT threshold check |
| `check:dsl-types-ssot` / `check:ssot:*` | focused diagnosis and reviewer evidence when a release candidate drifts |

## Explicit Non-Goal

- This gate does not treat the fallback compatibility lane as an equal release target.
- Fallback exists for narrow compatibility routes; release decisions should judge the normal Preview / Export contract first.

## Related

- [ci-quality-gate.md](./ci-quality-gate.md)
- [TESTING.md](./TESTING.md)
- [html-exporter-primary-fallback-inventory.md](./html-exporter-primary-fallback-inventory.md)
- [ssot-metrics-and-ci-checks.md](./ssot-metrics-and-ci-checks.md)
