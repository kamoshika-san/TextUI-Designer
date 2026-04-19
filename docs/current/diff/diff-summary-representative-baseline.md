# Diff Semantic Summary Representative Baseline (D3-3)

Updated: 2026-03-29
Owner: Maintainer
Related ticket: `T-20260328-168`

## Purpose

This document defines the representative baseline strategy for the semantic
summary layer (Epic D).  It determines which summary outputs to capture as
baselines, how they relate to Epic C/J fixtures, and how summary drift is
detected in regression runs.

It specifies:
- which scenarios require a summary baseline
- the baseline format and storage convention
- how wording and grouping drift are detected
- the relationship to Epic J snapshot fixtures

It does not specify:
- the diff fixture format itself (J2-1 normalized snapshot contract)
- CI lane configuration for regression runs (J3-1)
- the D3-2 rendering layer (formatting templates)

---

## 1. Why a separate summary baseline

Epic C/J regression fixtures lock the structural event output (`DiffResultExternal`).
Semantic summary output (`DiffNarrativeResult`) adds a second layer that can drift
independently:

- `summaryKey` label wording changes
- grouping axis assignment changes
- severity assignment changes
- narrative paragraph wording changes

A summary baseline catches drift in the D2-x rule layer without requiring a
full rendering regression.

---

## 2. Scenario catalog

The following representative scenarios require a summary baseline:

| Scenario ID | Event type | Expected axis | Expected severity |
|---|---|---|---|
| SB-01 | add (component) | structure | s1-info |
| SB-02 | remove (component) | structure | s2-review |
| SB-03 | update-property | presentation | s0-minor |
| SB-04 | update-component | behavior | s2-review |
| SB-05 | rename | structure | s1-info |
| SB-06 | reorder (heuristic) | structure | s1-info |
| SB-07 | remove+add (ambiguity) | ambiguity | s3-critical |
| SB-08 | permission hook fired | permission | s2-review |
| SB-09 | state hook fired | state | s2-review |
| SB-10 | transition hook fired | flow | s2-review |
| SB-11 | event hook fired | event | s1-info |
| SB-12 | mixed: add + remove+add | ambiguity + structure | s3-critical |

**Negative baseline** (must NOT produce a summary finding):

| Scenario ID | Description |
|---|---|
| SB-N01 | identical documents (zero diff) |
| SB-N02 | reorder within deterministic bounds (no heuristic) |

---

## 3. Baseline format

Each summary baseline is a JSON snapshot of the `DiffNarrativeResult` output
for the corresponding scenario fixture:

```json
{
  "scenarioId": "SB-01",
  "description": "add component",
  "narrativeResult": {
    "kind": "diff-narrative-result",
    "groups": [
      {
        "axis": "structure",
        "highestSeverity": "s1-info",
        "narrative": "**Structure** — 1 item.",
        "items": [
          {
            "eventId": "...",
            "summaryKey": "structure.add-component",
            "severity": "s1-info",
            "label": "Component added",
            "heuristicDerived": false,
            "ambiguityMarker": false,
            "ruleTrace": "classifyEvent:add→structure.add-component"
          }
        ]
      }
    ],
    "metadata": {
      "totalGroups": 1,
      "totalItems": 1,
      "highestSeverity": "s1-info",
      "containsAmbiguity": false,
      "containsHeuristic": false
    }
  }
}
```

---

## 4. Storage convention

Summary baselines are stored alongside D2 unit test fixtures:

```
tests/
  fixtures/
    summary-baselines/
      SB-01_add-component.json
      SB-02_remove-component.json
      ...
      SB-N01_identical.json
      SB-N02_reorder-deterministic.json
```

Each file name follows `<scenarioId>_<short-description>.json`.

---

## 5. Drift detection strategy

A summary baseline regression run:

1. Loads the scenario fixture (structural diff input)
2. Runs `classifyReviewImpact` + `applySummaryRule` + `assembleSummaryNarrative`
3. Compares output to the stored baseline JSON

**Comparison policy:**

| Field | Comparison |
|---|---|
| `groups[].axis` | Exact match |
| `groups[].highestSeverity` | Exact match |
| `groups[].narrative` | Normalized whitespace match (not exact wording) |
| `items[].summaryKey` | Exact match |
| `items[].severity` | Exact match |
| `items[].label` | Normalized whitespace match |
| `items[].heuristicDerived` | Exact match |
| `items[].ambiguityMarker` | Exact match |
| `items[].ruleTrace` | Ignored in baseline comparison (diagnostic only) |
| `metadata.*` | Exact match |

**Normalized whitespace match**: strip leading/trailing whitespace, collapse
internal whitespace to single space.  This avoids spurious failures from
minor label punctuation changes while still catching semantic drift.

---

## 6. Relationship to Epic C/J fixtures

| Layer | Source fixture | Baseline type |
|---|---|---|
| Structural diff (Epic C) | `tests/fixtures/diff-core/` | `DiffResultExternal` snapshot (J2-1) |
| Semantic summary (Epic D) | `tests/fixtures/summary-baselines/` | `DiffNarrativeResult` snapshot (D3-3) |

D3-3 baselines are driven by the same structural input as C/J fixtures but
capture a different output layer.  Keeping them separate avoids conflating
event-level regression with summary-level regression.

Summary baselines do not need to cover every C/J scenario — only the
representative cases in section 2 that cover the full D2-x rule surface.

---

## 7. Update policy

When a D2-x rule intentionally changes (label wording update, severity
reclassification, hook refinement):

1. Run the summary regression to identify affected baselines.
2. Review each affected baseline for intentional vs unintentional change.
3. Update baseline files and commit with a message explaining the rule change.
4. The commit message must reference the ticket that authorized the rule change.

Automated baseline updates (snapshot update flags) are allowed only under
explicit test flag (`--update-summary-baselines`).  Never silently auto-update
in CI.

---

## 8. What this document does NOT define

- J2-1 normalized snapshot format (Epic J)
- CI lane wiring for summary regression runs (J3-1)
- How D3-2 rendering output is regression-tested (separate D3-2/D3-3 concern)
- Which CI events trigger a full summary regression vs a fast targeted run
