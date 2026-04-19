# Diff Check-Run Contract and Degraded Output Policy (G2-2 / G2-3)

Updated: 2026-03-29
Owner: Maintainer
Related tickets: `T-20260328-190` (G2-2), `T-20260328-191` (G2-3)

## Purpose

This document defines two related contracts for the CI/check-run surface:

- **G2-2**: The status and finding contract for check-runs and CI gates.
- **G2-3**: The degraded output and failure reporting policy when the diff
  workflow cannot produce a complete result.

Both contracts share a common failure taxonomy so that PR surface, CLI, and
check-run consumers can handle error cases consistently.

---

## Part 1 — G2-2: Check-Run Status and Finding Contract

### 1.1 Gate signal definition

The check-run produces one of three gate signals:

| Signal | Condition |
|---|---|
| `pass` | No s2-review or s3-critical findings; no ambiguity findings |
| `warn` | At least one s2-review finding, OR containsHeuristic=true with no critical |
| `fail` | At least one s3-critical finding, OR containsAmbiguity=true |

**Signal priority**: `fail` > `warn` > `pass`.  A result with both s2-review and
s3-critical items emits `fail`.

The gate signal is separate from the diff workflow exit code.  A clean diff
(zero changes) always emits `pass` regardless of heuristic usage.

### 1.2 DiffCheckRunResult

```ts
interface DiffCheckRunResult {
  kind: 'diff-check-run-result';
  /** Gate signal for the CI check. */
  signal: 'pass' | 'warn' | 'fail';
  /** Human-readable one-line summary for the check-run title. */
  title: string;
  /** Representative findings (max 5, s3-critical first). */
  findings: DiffCheckRunFinding[];
  /** Aggregate counts. */
  counts: {
    total: number;
    critical: number;
    review: number;
    ambiguity: number;
  };
  /** Traceability back to the source diff result. */
  sourceRef: DiffCheckRunSourceRef;
}
```

### 1.3 DiffCheckRunFinding

```ts
interface DiffCheckRunFinding {
  eventId: string;
  severity: DiffSummarySeverity;
  label: string;
  /** Axis of the finding (structural / behavior / ambiguity / etc.) */
  axis: DiffSummaryImpactAxis;
  heuristicDerived: boolean;
  ambiguityMarker: boolean;
}
```

Maximum **5 representative findings** are included.  Selection priority:
1. s3-critical items (all included if ≤5 total)
2. ambiguityMarker=true items (always included, never truncated)
3. s2-review items (fill remaining slots)

### 1.4 DiffCheckRunSourceRef

```ts
interface DiffCheckRunSourceRef {
  engine: string;
  schemaVersion: string;
  previousPageId: string;
  nextPageId: string;
}
```

### 1.5 Title generation

```
pass:  "TextUI diff: no critical findings (<N> change(s))"
warn:  "TextUI diff: review recommended (<N> change(s), <M> heuristic)"
fail:  "TextUI diff: critical findings (<N> critical, <M> ambiguous)"
```

### 1.6 Policy violation vs runtime failure

These two failure categories must be reported through separate channels:

| Category | Definition | Channel |
|---|---|---|
| Policy violation | s3-critical or ambiguity finding based on diff content | Gate signal (`warn`/`fail`) |
| Runtime failure | Workflow error, timeout, partial result | Separate `DiffWorkflowError` (see Part 2) |

A check-run must never conflate a policy violation finding with a runtime
failure.  If both occur (partial result with some critical findings), the
runtime failure takes precedence: emit `DiffWorkflowError` alongside a partial
`DiffCheckRunResult` if possible, or a `DiffWorkflowError` alone if no partial
result is available.

---

## Part 2 — G2-3: Degraded Output and Failure Reporting Policy

### 2.1 Result state taxonomy

| State | Definition |
|---|---|
| `complete` | Full diff produced; all events paired or unpaired as expected |
| `partial` | Some events processed; workflow stopped before completion |
| `stale` | Result from a prior run; current inputs have changed since capture |
| `no-result` | Workflow could not produce any diff output |

A `stale` result is distinct from `partial` — it means the result is complete
but no longer current.  Consumers must treat `stale` as informational, not as
an error.

### 2.2 DiffWorkflowError

Emitted when result state is not `complete`.

```ts
interface DiffWorkflowError {
  kind: 'diff-workflow-error';
  /** Result state at time of failure. */
  resultState: 'partial' | 'stale' | 'no-result';
  /** Error category (see 2.3). */
  errorKind: DiffWorkflowErrorKind;
  /** Human-readable explanation for the user (reviewer surface). */
  userMessage: string;
  /** Operator-facing diagnostic detail (CLI / log surface). */
  diagnosticDetail: string;
  /** Partial result, if available. Null when resultState is 'no-result'. */
  partialResult: DiffResultExternal | null;
}
```

### 2.3 DiffWorkflowErrorKind taxonomy

```ts
type DiffWorkflowErrorKind =
  | 'input-parse-failure'     // Could not parse previous or next document
  | 'diff-engine-error'       // Core diff engine threw an unhandled error
  | 'timeout'                 // Diff exceeded configured time budget
  | 'unsupported-hook'        // A D2-2 extension hook is not available
  | 'schema-validation-error' // Output failed schema validation
  | 'unknown';                // Catch-all; must include diagnosticDetail
```

### 2.4 Surface behavior under degraded state

| Surface | partial | stale | no-result |
|---|---|---|---|
| PR comment | Show partial findings + warning banner | Show stale banner, link to last fresh run | Show error block, no findings |
| CLI | Print partial results + warning | Print stale notice + timestamp | Print error, exit non-zero |
| Check-run | `warn` signal + partial findings | `warn` signal + stale notice | `fail` signal + error message |

**Key rule**: No surface should silently swallow a degraded state.  A visible
warning or error must always accompany partial or missing results.

### 2.5 Operator diagnostics vs user-facing warnings

`DiffWorkflowError` carries two separate message fields:

- `userMessage` — plain language, suitable for PR comments and CLI output.
  Must not include stack traces or internal field paths.
- `diagnosticDetail` — technical detail for operator logs.  May include
  error types, hook names, input file paths, and timing information.

Renderers must not expose `diagnosticDetail` to the PR comment surface.

### 2.6 unsupported-hook handling

When a D2-2 extension hook is not available at runtime:

1. Log the missing hook name to `diagnosticDetail`.
2. Continue the diff without the hook (use the base classification only).
3. Emit an `unsupported-hook` error **only if the hook was declared required**.
4. For optional hooks: proceed silently, no `DiffWorkflowError` emitted.

This avoids breaking CI for environments that do not have all optional hooks
installed.

---

## Part 3 — Shared taxonomy summary

| Concept | G2-2 | G2-3 |
|---|---|---|
| Success signal | `pass` / `warn` / `fail` | `complete` |
| Error channel | (not applicable — gate signal) | `DiffWorkflowError` |
| Partial result | Emitted alongside error | `partial` state + `partialResult` |
| Ambiguity always surfaced | Yes (never truncated) | Yes (always in partialResult if present) |
| ruleTrace in output | No | No (diagnosticDetail only) |

Both parts use the same `DiffSummarySeverity` and `DiffSummaryImpactAxis` enums
from the Epic D vocabulary.

---

## What this document does NOT define

- GitHub check-run API call structure (G2 integration layer)
- How `timeout` duration is configured (G3 workflow config, G3-1)
- How `stale` results are detected or cached (G3 infrastructure)
- CLI exit code values (G1-1 mode contract)
