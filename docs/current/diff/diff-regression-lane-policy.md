# Diff Regression Lane Policy (J3-1)

Updated: 2026-03-30
Owner: Maintainer
Related ticket: `T-20260328-205`

## Purpose

This document defines how the diff regression suite is divided between the local
lane and the CI lane, which lane is responsible for each test category, and how
the existing test scripts are extended without conflict.

It specifies:
- the fast lane and full lane definitions
- the lane assignment for each test category
- how snapshot-only, metadata assertion, and workflow tests are separated
- the entry point for each lane

It does not specify:
- snapshot format or assertion vocabulary (J2-1 / J2-2)
- test harness helpers or tier execution rules (J2-3)
- snapshot update policy or failure triage (J3-2)
- coverage matrix (J3-3)

---

## 1. Lane definitions

### 1.1 Fast lane (local default)

**Scope**: Tier-A tests only (J2-3 §1.1).

**Characteristics**:
- No filesystem I/O beyond fixture files already in `test/fixtures/`
- No config file reads
- Target execution time: < 30 seconds for the diff-related subset
- Runs as part of `npm test` (the existing pre-commit test run)

**Entry point**: Existing Mocha test suite with no additional flags.  Diff
regression tests tagged as Tier-A must be added to `tests/unit/` and picked
up automatically.

### 1.2 Full lane (CI-required, local opt-in)

**Scope**: Tier-A tests + Tier-B workflow tests (J2-3 §1.2).

**Characteristics**:
- Includes file-backed fixture execution via `runWorkflowFromFiles`
- Reads config via explicit objects (not local `textui.config.*`)
- Longer execution time; acceptable for CI but disruptive for pre-commit
- Local opt-in via `--workflow` flag passed to Mocha

**Entry point**: `npm test -- --workflow` locally, or the CI job script which
always includes `--workflow`.

---

## 2. Lane assignment by test category

| Test category | Lane | Runner | Entry |
|---|---|---|---|
| H1-1 N1–N6 rescue candidates | Fast | Mocha (Tier A) | `tests/unit/` |
| H1-2 P1–P5 non-rescue | Fast | Mocha (Tier A) | `tests/unit/` |
| H1-3 FZ-01–06 forbidden zone | Fast | Mocha (Tier A) | `tests/unit/` |
| H1-3 MC-01–03 multi-candidate | Fast | Mocha (Tier A) | `tests/unit/` |
| J2-1 structural snapshot assertion | Fast | Mocha (Tier A) | `tests/unit/` |
| J2-2 metadata assertion | Fast | Mocha (Tier A) | `tests/unit/` |
| G3-2 WB-H1 happy path workflow | Full | Mocha (Tier B) | `tests/unit/` + `--workflow` |
| G3-2 WB-D1/D2/D3 degraded workflow | Full | Mocha (Tier B) | `tests/unit/` + `--workflow` |
| E3-2 artifact baseline (AB-01–AB-06) | Full | Mocha (Tier B) | `tests/unit/` + `--workflow` |

---

## 3. Snapshot sub-lanes

Within Tier-A, three sub-lanes serve different verification purposes.
They are not separate test suites but are logical groupings within `tests/unit/`:

| Sub-lane | Purpose | J2-x reference |
|---|---|---|
| **Snapshot-only** | Assert structural layer (eventKind/pairingClass/fallbackMarker) exact match | J2-1 structural layer |
| **Metadata assertion** | Assert metadata layer (sourceRef/explicitness/scoringOutcome) via normalized match | J2-2 assertion vocabulary |
| **Workflow assertion** | Assert resultState + error shape for degraded scenarios (Tier B only) | J2-3 Tier B |

A single test file may mix snapshot-only and metadata assertion sub-lanes for
the same fixture.  Workflow assertion must remain in Tier-B-only test files to
preserve fast-lane execution time.

---

## 4. Integration with existing test scripts

The existing `npm test` script runs all `tests/unit/**/*.test.js` files.  The
diff regression Tier-A tests are added to `tests/unit/` and are automatically
included.

For Tier-B tests, a `--workflow` flag is introduced as a Mocha option.
Test files containing Tier-B tests must check for this flag at module load and
skip (`this.skip()`) when the flag is absent.

```js
// Tier-B test files begin with:
const RUN_WORKFLOW = process.argv.includes('--workflow');
before(function() { if (!RUN_WORKFLOW) { this.skip(); } });
```

This pattern prevents Tier-B tests from slowing the local fast lane without
requiring a separate test runner or separate `package.json` script.

---

## 5. CI configuration

The CI job must:

1. Run `npm test -- --workflow` (not just `npm test`) to include Tier-B tests.
2. Fail the build if any Tier-A or Tier-B diff regression test fails.
3. Block snapshot updates (`--update-snapshots` must not be passed in CI).

The CI job must not run with `--update-snapshots`.  Snapshot updates are a
developer-local action only (J3-2).

---

## 6. What this document does NOT define

- Snapshot file naming conventions (J3-2/J3-3)
- How to update or regenerate snapshots (J3-2)
- Coverage matrix of which fixture scenarios must exist (J3-3)
- The specific fixture files to create (H1-1/H1-3 catalog; G3-2 workflow baselines)
