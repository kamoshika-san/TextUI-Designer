# Diff End-to-End Workflow Baseline (G3-2)

Updated: 2026-03-29
Owner: Maintainer
Related ticket: `T-20260328-193`

## Purpose

This document defines the representative end-to-end workflow baseline cases for
the TextUI diff pipeline.  It covers the path from compare invocation through
reviewer surface / PR / check-run output, for both happy path and degraded path
scenarios.

It specifies:
- the happy path baseline (complete, review-oriented run)
- the degraded path baselines (partial result, no-result, stale)
- the contract connection points across Epic C/D/E/G
- the structure that makes these baselines executable in Epic J regression

It does not specify:
- J2-1 normalized snapshot format (Epic J)
- CI lane wiring (J3-1)
- Rollout sequencing or operator procedures (G3-3)

---

## 1. Happy path baseline (WB-H1)

**Scenario**: Two versions of a TextUI document are compared in `review-oriented`
mode with all core features enabled.

### 1.1 Inputs

| Input | Value |
|---|---|
| `enablementAxis` | `pr-enabled` |
| `mode` | `advisory` |
| `features.summaryOutput` | `true` |
| `features.artifactOutput` | `true` |
| `features.extensionHooks` | `false` |
| Document pair | previous: `page-home-v1`, next: `page-home-v2` |

### 1.2 Expected pipeline path

```
compareDocuments(previous, next)
  ↓ DiffCompareResult (Epic C)
buildDiffResultExternal(result, { producer, includeDiagnostics: false })
  ↓ DiffResultExternal (E1-3)
assembleSummaryNarrative(classifyReviewImpact events)
  ↓ DiffNarrativeResult (D2-3)
buildDiffPRCommentPayload(narrativeResult, externalResult)
  ↓ DiffPRCommentPayload (G2-1)
renderDiffPRComment(payload, 'full')
  ↓ string (D3-2)
writeDiffArtifact(externalResult)        → *.diff.json
writeDiffPRSummaryExport(narrativeResult) → *.diff.json.summary.json
```

### 1.3 Expected contract outputs

| Output | Required fields |
|---|---|
| `DiffResultExternal` | kind, schemaVersion, producer, events[], metadata |
| `DiffNarrativeResult` | groups[], metadata.highestSeverity, containsAmbiguity |
| `DiffCheckRunResult` | signal (pass/warn/fail), findings[], counts |
| `DiffPRCommentPayload` | headline, groups[], truncation |
| Artifact file | `*.diff.json` written to `.textui/diff-artifacts/` |
| Summary sidecar | `*.diff.json.summary.json` written alongside artifact |

### 1.4 Assertions

1. `DiffResultExternal.schemaVersion === 'diff-result-external/v0'`
2. `DiffResultExternal.events.length === DiffExternalMetadata.eventCount`
3. No event's `fallbackMarker === 'remove-add-fallback'` in a clean comparison
4. `DiffNarrativeResult.groups` ordered by canonical D2-3 axis order
5. Artifact file exists at expected path after run
6. Summary sidecar exists when `summaryOutput === true`

---

## 2. Degraded path baselines

### 2.1 Partial result (WB-D1)

**Scenario**: Diff engine processes half of a large document before timeout.

| Step | Expected behavior |
|---|---|
| `DiffWorkflowError.resultState` | `'partial'` |
| `DiffWorkflowError.errorKind` | `'timeout'` |
| `DiffWorkflowError.partialResult` | Non-null, contains events processed before timeout |
| CLI output | Partial results shown + warning line |
| Check-run signal | `'warn'` (partial result treated as inconclusive) |
| PR comment | Partial findings block + attention banner "Incomplete result" |
| Artifact | Written if `artifactOutput` enabled, includes only processed events |

### 2.2 No-result (WB-D2)

**Scenario**: Input document fails to parse.

| Step | Expected behavior |
|---|---|
| `DiffWorkflowError.resultState` | `'no-result'` |
| `DiffWorkflowError.errorKind` | `'input-parse-failure'` |
| `DiffWorkflowError.partialResult` | `null` |
| CLI output | Error message + exit non-zero (strict) or exit 0 (advisory) |
| Check-run signal | `'fail'` |
| PR comment | Error block only, no findings |
| Artifact | Not written |

### 2.3 Stale result (WB-D3)

**Scenario**: Artifact exists but was produced against an older document version.

| Step | Expected behavior |
|---|---|
| `DiffWorkflowError.resultState` | `'stale'` |
| `DiffWorkflowError.errorKind` | `'unknown'` (stale detection is external) |
| CLI output | Stale notice with timestamp of last fresh run |
| Check-run signal | `'warn'` |
| PR comment | Stale banner with link to last fresh artifact |

---

## 3. Epic contract connection points

These are the boundaries that the end-to-end baseline must cross and validate:

| Boundary | From | To | Validated by |
|---|---|---|---|
| C→E | `DiffCompareResult` | `DiffResultExternal` | `buildDiffResultExternal()` projection (E1-3) |
| C→D | `DiffCompareResult.events` | `DiffReviewImpact[]` | `classifyReviewImpact()` (D2-1) |
| D→G | `DiffNarrativeResult` | `DiffPRCommentPayload` | `buildDiffPRCommentPayload()` (G2-1) |
| E→storage | `DiffResultExternal` | artifact file | `writeDiffArtifact()` (E2-2) |
| G→render | `DiffPRCommentPayload` | PR comment string | `renderDiffPRComment()` (D3-2) |
| G→CI | `DiffCheckRunResult` | check-run gate signal | `buildDiffCheckRunResult()` (G2-2) |

---

## 4. Epic J regression structure

Each baseline case maps to one J-level executable test:

| Baseline ID | J test fixture | What it asserts |
|---|---|---|
| WB-H1 | `fixtures/e2e/happy-path-review-oriented.json` | Full pipeline output contract |
| WB-D1 | `fixtures/e2e/degraded-timeout-partial.json` | DiffWorkflowError + partial output |
| WB-D2 | `fixtures/e2e/degraded-parse-failure.json` | DiffWorkflowError + no output |
| WB-D3 | `fixtures/e2e/degraded-stale.json` | Stale state + warning surface |

Fixtures store the input document pair and the expected output at each pipeline
stage.  The J2-1 normalized snapshot format governs the exact fixture schema.

---

## 5. What this document does NOT define

- J2-1 normalized snapshot format details (Epic J)
- J3-1 CI lane configuration
- G3-1 feature gate config (separate doc)
- G3-3 rollout sequencing
