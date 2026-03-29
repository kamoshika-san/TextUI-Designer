# Diff External Artifact Baseline and Contract Change Checklist (E3-2 / E3-3)

Updated: 2026-03-29
Owner: Maintainer
Related tickets: `T-20260328-180` (E3-2), `T-20260328-181` (E3-3)

## Purpose

This document defines two related artifacts for external contract stability:

- **E3-2**: The representative baseline strategy for external diff artifacts.
- **E3-3**: The review checklist to follow before any external contract change.

---

## Part 1 — E3-2: External Artifact Representative Baseline

### 1.1 Why a separate artifact baseline

D3-3 (summary baseline) locks `DiffNarrativeResult` output.
J2-1 (normalized snapshot) locks `DiffResultExternal` event structure.
E3-2 locks the **full artifact payload** including:
- complete `DiffResultExternal` with all required fields
- optional extension fields (`diagnostics`, `summary`) when present
- `producer` metadata, `schemaVersion` stability
- artifact filename convention (E2-2)

A full-artifact baseline catches regressions that are invisible in event-level
snapshot tests: producer field drift, metadata count mismatches, schemaVersion
omissions, sidecar file absences.

### 1.2 Baseline scenario catalog

| Scenario ID | Description | Extension fields |
|---|---|---|
| AB-01 | Minimal run — no extensions | None |
| AB-02 | With diagnostics — diagnostics extension present | `diagnostics` |
| AB-03 | With summary — narrative summary extension present | `summary` |
| AB-04 | Full run — all extensions present | `diagnostics`, `summary` |
| AB-N01 | Zero-diff (identical documents) | None |
| AB-N02 | No-result error | DiffWorkflowError only (no artifact) |

### 1.3 Baseline format

Each baseline is a JSON file capturing the full artifact payload:

```json
{
  "scenarioId": "AB-01",
  "description": "minimal run — no extensions",
  "artifactFilename": "page-test-a__page-test-b__2026-03-29T00-00-00Z.diff.json",
  "payload": {
    "kind": "textui-diff-result-external",
    "schemaVersion": "diff-result-external/v0",
    "producer": {
      "engine": "textui-diff-core",
      "engineVersion": "0.0.0",
      "compareStage": "c1-skeleton",
      "producedAt": "<timestamp>"
    },
    "events": [],
    "metadata": {
      "eventCount": 0,
      "previousSource": { "pageId": "page-test-a" },
      "nextSource":     { "pageId": "page-test-b" }
    }
  }
}
```

`producedAt` and `engineVersion` are normalized to sentinel values
(`"0.0.0"`, `"2026-01-01T00:00:00Z"`) for stable comparison.

### 1.4 Storage convention

```
tests/
  fixtures/
    artifact-baselines/
      AB-01_minimal.json
      AB-02_with-diagnostics.json
      AB-03_with-summary.json
      AB-04_full.json
      AB-N01_zero-diff.json
      AB-N02_no-result.json
```

### 1.5 Drift detection policy

| Field group | Comparison |
|---|---|
| `kind`, `schemaVersion` | Exact match |
| `producer.engine`, `producer.compareStage` | Exact match |
| `producer.engineVersion` | Normalized to sentinel before comparison |
| `producer.producedAt` | Normalized to sentinel before comparison |
| `events[].eventId` | Exact match |
| `events[].kind`, `events[].entityKind` | Exact match |
| `events[].pairingReason`, `events[].fallbackMarker` | Exact match |
| `events[].previousPath`, `events[].nextPath` | Exact match |
| `metadata.eventCount` | Exact match (must equal `events.length`) |
| `diagnostics.*` | Exact match when present |
| `summary.metadata.*` | Exact match when present |
| `summary.groups[].axis`, `groups[].highestSeverity` | Exact match when present |

**Update policy**: Same as D3-3 — use `--update-artifact-baselines` flag for
intentional updates; never auto-update in CI.

### 1.6 Relationship to D3-3 and J2-1

| Baseline layer | Captures | Source fixture |
|---|---|---|
| J2-1 (event snapshot) | `DiffResultExternal.events[]` field-by-field | diff-core fixtures |
| D3-3 (summary snapshot) | `DiffNarrativeResult` groups and items | summary-baselines/ |
| E3-2 (artifact baseline) | Full artifact payload with all extension fields | artifact-baselines/ |

E3-2 is complementary to J2-1 — it adds coverage of producer metadata,
schemaVersion, and extension field presence that J2-1 does not capture.

---

## Part 2 — E3-3: Contract Change Review Checklist

This checklist must be completed before merging any PR that changes:
- `src/core/textui-diff-result-external.ts`
- `schemas/diff-result-external-v0.json` (or any new version schema)
- Any type exported from the external contract module

### Checklist

#### A. Classification

- [ ] Classify the change using E3-1 taxonomy: additive / breaking / cosmetic
- [ ] If breaking: confirm a new `schemaVersion` value has been created
- [ ] If additive: confirm no existing required field was removed or reinterpreted
- [ ] If cosmetic: confirm no type or enum change is present

#### B. JSON Schema consistency

- [ ] TypeScript type and JSON Schema are in sync
- [ ] `additionalProperties: false` is still set on all object types
- [ ] New optional fields are in `properties` but **not** in `required[]`
- [ ] New enum values do not conflict with existing values
- [ ] Old schema file is preserved when a new version is introduced

#### C. Downstream consumer impact

- [ ] E2-1 CLI render: does the new/changed field affect output format?
- [ ] D3-2 PR comment rendering: does the change affect any displayed field?
- [ ] G2-1 PR comment adapter: does `DiffPRCommentPayload` need updating?
- [ ] E2-3 PR summary export: does `DiffPRSummaryExport` stay in sync?
- [ ] Regression baselines (J2-1, D3-3, E3-2): have affected baselines been updated?

#### D. Serialization policy alignment (E1-2)

- [ ] `ruleTrace` is still excluded from all external types
- [ ] `hasFallback` is still excluded from all external types
- [ ] `DiffCompareResult` or any Epic C internal type is not imported

#### E. Version and compatibility

- [ ] If breaking: consumer fallback strategy (E3-1 section 4) is still valid
- [ ] If adding a new `schemaVersion`: old version artifacts remain readable
- [ ] Release note impact assessed (see G3-3 section 7)

#### F. Test coverage

- [ ] E3-2 artifact baselines updated if payload shape changed
- [ ] J2-1 normalized snapshots updated if event fields changed
- [ ] D3-3 summary baselines updated if summary fields changed
- [ ] E3-1 change classification documented in PR description

---

## What this document does NOT define

- Migration tooling for upgrading v0 artifacts to v1+ (future E3 work)
- Automated schema diffing (future tooling)
- Release approval process (engineering / product decision)
