# CI Quality Gate And Branch Protection

This page defines the current CI entrypoints, the checks intended for branch protection, and the minimum release-gate interpretation for `main`.

## npm Script Entry Points

| Script | Purpose |
|---|---|
| `pretest:ci` | `compile` -> `typecheck:strict` -> `lint` |
| `test:all:ci` | `pretest:ci` -> `test:unit` -> `test:integration` -> `test:e2e` -> `test:regression` |
| `react-ssot-check` | Focused React SSoT guard for Preview / Export DOM parity and theme vars contract |
| `metrics:collect` | Collect repo metrics used by release gates |
| `metrics:check:ssot` | Fail when SSoT metrics drift past the allowed threshold |
| `check:dsl-types-ssot` | Fail when `renderer/types` imports reappear |
| `check:import-graph` | Fail when representative cross-lane import boundaries drift |

## GitHub Actions Checks

The workflow lives in `.github/workflows/ci.yml`.

| Check | What it covers |
|---|---|
| `React SSoT Check` | `npm run compile` followed by `npm run react-ssot-check` |
| `Test All CI` | `npm run test:all:ci` as the single full-lane CI command |
| `Code metrics` | `npm run metrics:collect` and `npm run metrics:check:ssot` |
| `Test Suite` | Node `18.x` / `20.x` matrix lane for `pretest:ci`, sample validation, unit tests, and coverage |
| `Lint & Format Check` | ESLint / formatting gate |
| `Build Extension` | compile, package, and artifact build after core checks pass |
| `Integration Tests` | integration lane after the main checks pass |

## Minimum Required Checks

The minimum branch-protection set for `main` is:

1. `React SSoT Check`
2. `Test All CI`
3. `Code metrics`

Recommended additional checks when the repository host allows more required checks:

1. `Lint & Format Check`
2. `Build Extension`
3. `Test Suite`

## Release-Gate Meaning

- `React SSoT Check` is the fail-fast guard for the React canonical rendering path.
- `Test All CI` proves the standard unit / integration / e2e / regression lanes still pass together.
- `Code metrics` is the SSoT release gate and must keep `renderer/types imports = 0`.

## React-Primary Release Checklist

Use this checklist when a branch or candidate is being judged against the current React-primary release contract:

1. `npm run react-ssot-check`
2. `npm run test:all:ci`
3. `npm run metrics:collect`
4. `npm run metrics:check:ssot`

Interpret the results as:

- structure parity: `react-ssot-check`
- theme parity: `react-ssot-check`
- representative sample coverage: `test:all:ci`
- SSoT threshold and drift gate: `metrics:check:ssot`

Use `npm run check:dsl-types-ssot` and `npm run check:ssot:*` as focused diagnosis when the release candidate or review evidence needs the cause of drift, not as a replacement for the release gate itself.

## React SSoT Check Scope

`npm run react-ssot-check` currently runs these focused tests:

1. `tests/unit/shared-kernel-preview-export-parity.test.js`
2. `tests/unit/react-theme-vars-preview-export-contract.test.js`

Use this lane when a change may affect:

- Preview vs Export DOM shape
- React shared-kernel rendering parity
- theme variable generation and export contract alignment

Keep this lane focused. Do not expand it into a second full test suite.

## Branch Protection Checklist

- Add a protection rule for `main`
- Require pull requests before merging
- Require branches to be up to date before merging
- Require status checks to pass before merging
- Mark `React SSoT Check`, `Test All CI`, and `Code metrics` as required

## Related Documents

- `AGENTS.md`
- `docs/react-primary-release-gate.md`
- `docs/ssot-metrics-and-ci-checks.md`
- `docs/import-boundaries-4-lanes.md`
- `docs/html-exporter-primary-fallback-inventory.md`
