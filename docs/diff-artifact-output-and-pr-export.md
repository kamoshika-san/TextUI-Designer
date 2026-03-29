# Diff Artifact Output and PR Surface Export Contract (E2-2 / E2-3)

Updated: 2026-03-29
Owner: Maintainer
Related tickets: `T-20260328-177` (E2-2), `T-20260328-178` (E2-3)

## Purpose

This document defines two related output contracts for the diff workflow:

- **E2-2**: The JSON artifact output format and file storage policy.
- **E2-3**: The PR surface summary export contract that bridges Epic D
  narrative output to PR-facing consumers.

---

## Part 1 — E2-2: JSON Artifact Output and Storage Policy

### 1.1 Artifact content

The JSON artifact is the persisted, machine-readable form of a completed diff
run.  It is the `DiffResultExternal` payload serialized to disk.

**Required fields in the artifact:**

All fields required by `diff-result-external/v0` schema:
- `kind` (`"textui-diff-result-external"`)
- `schemaVersion` (`"diff-result-external/v0"`)
- `producer` (engine, engineVersion, compareStage, producedAt)
- `events[]`
- `metadata`

**Optional fields (included when requested):**
- `diagnostics` (when `--diagnostics` flag is active)
- `summary` (when `--review-oriented` flag is active)

The artifact must always include `producedAt` (ISO 8601 UTC) so that stale
detection (G2-3) can determine freshness.

### 1.2 Filename policy

```
<outputDir>/<previousPageId>__<nextPageId>__<timestamp>.diff.json
```

- `previousPageId` and `nextPageId` come from `DiffExternalMetadata.previousSource.pageId`
  and `.nextSource.pageId`.
- `timestamp` is the `producedAt` value with `:` replaced by `-` and `Z` retained.
- `__` (double underscore) separates segments.

**Example:**

```
.textui/diff-artifacts/page-home__page-home-v2__2026-03-29T14-30-00Z.diff.json
```

**Filename character policy:**
- Page IDs are normalized: non-alphanumeric characters replaced with `-`.
- Maximum total filename length: 255 characters.  If exceeded, page IDs are
  truncated to 40 characters each with a trailing `-t` truncation marker.

### 1.3 Directory policy

Default output directory: `.textui/diff-artifacts/`

The directory is created if absent.  It is not cleaned automatically;
consumers are responsible for pruning old artifacts.

The caller (G1-1 pipeline) may override the output directory via configuration.
The artifact filename policy (section 1.2) applies regardless of directory.

### 1.4 Minimum required fields for regression harness compatibility

For Epic J regression harness (J2-1 normalized payload), the artifact must
preserve:
- `events[].eventId` (stable reference)
- `events[].kind`
- `events[].pairingReason`
- `events[].fallbackMarker`
- `events[].previousPath` / `nextPath`
- `metadata.eventCount`

These fields must never be omitted even if the artifact is written in a
future streamlined mode.

### 1.5 Artifact write function signature

```ts
interface DiffArtifactWriteOptions {
  outputDir?: string;        // default: '.textui/diff-artifacts'
  includeSummary?: boolean;  // default: false
  includeDiagnostics?: boolean; // default: false
}

async function writeDiffArtifact(
  result: DiffResultExternal,
  options?: DiffArtifactWriteOptions
): Promise<string>  // returns the full artifact file path
```

---

## Part 2 — E2-3: PR Surface Summary Export Contract

### 2.1 Purpose

The PR surface export contract defines a compact, structured representation of
the semantic summary that is suitable for:
- JSON storage alongside the diff artifact
- machine-readable consumption by PR formatters (D3-2 / G2-1)
- cross-run comparison (has the summary changed between runs?)

### 2.2 DiffPRSummaryExport

```ts
interface DiffPRSummaryExport {
  kind: 'diff-pr-summary-export';
  schemaVersion: 'diff-pr-summary-export/v0';
  /** Captured from DiffNarrativeResult.metadata. */
  metadata: {
    totalGroups: number;
    totalItems: number;
    highestSeverity: DiffSummarySeverity | null;
    containsAmbiguity: boolean;
    containsHeuristic: boolean;
  };
  /** Groups from DiffNarrativeResult.groups[]. */
  groups: DiffPRSummaryExportGroup[];
  /** ISO 8601 UTC timestamp when this export was produced. */
  exportedAt: string;
  /** Reference to the source diff artifact filename (not full path). */
  sourceArtifact: string;
}
```

### 2.3 DiffPRSummaryExportGroup

```ts
interface DiffPRSummaryExportGroup {
  axis: DiffSummaryImpactAxis;
  highestSeverity: DiffSummarySeverity;
  /** Narrative paragraph (D2-3 output, passed through unchanged). */
  narrative: string;
  items: DiffPRSummaryExportItem[];
}
```

### 2.4 DiffPRSummaryExportItem

```ts
interface DiffPRSummaryExportItem {
  eventId: string;
  summaryKey: string;
  severity: DiffSummarySeverity;
  label: string;
  heuristicDerived: boolean;
  ambiguityMarker: boolean;
  /** Evidence jump target (G1-3 contract). Null when not available. */
  evidenceJump: DiffReviewerEvidenceJump | null;
}
```

`ruleTrace` is **excluded** from the PR summary export (E1-2 production
surface policy).

### 2.5 Storage convention

The PR summary export is stored as a sidecar file alongside the diff artifact:

```
<artifactFilename>.summary.json
```

**Example:**

```
.textui/diff-artifacts/page-home__page-home-v2__2026-03-29T14-30-00Z.diff.json.summary.json
```

The sidecar is only written when `--review-oriented` mode is active.

### 2.6 Relationship to G2-1 adapter

`DiffPRSummaryExport` (E2-3) is the **stored** form.
`DiffPRCommentPayload` (G2-1) is the **live / ephemeral** form.

G2-1 may be constructed from a `DiffPRSummaryExport` when the diff artifact
already exists (e.g., re-posting a comment from a cached run).  The G2-1
adapter handles this reconstruction; E2-3 only defines the stored shape.

### 2.7 Export function signature

```ts
interface DiffPRSummaryExportOptions {
  outputDir?: string;           // default: same as artifact
  sourceArtifactFilename: string;  // required: artifact filename (not path)
}

async function writeDiffPRSummaryExport(
  narrativeResult: DiffNarrativeResult,
  evidenceMap: Map<string, DiffReviewerEvidenceJump | null>,
  options: DiffPRSummaryExportOptions
): Promise<string>  // returns the full export file path
```

`evidenceMap` is keyed by `eventId` and supplies the `evidenceJump` values
resolved by the G1-3 navigation contract.

---

## Part 3 — Shared storage summary

| File | Format | Written when |
|---|---|---|
| `*.diff.json` | `DiffResultExternal` | Always (on any diff run with artifact output) |
| `*.diff.json.summary.json` | `DiffPRSummaryExport` | Only with `--review-oriented` |

Both files share the same base filename stem and live in the same output
directory.

---

## What this document does NOT define

- JSON Schema for `DiffPRSummaryExport` (E3 schema extension concern)
- How `evidenceMap` is constructed (G1-3 navigation contract)
- Artifact retention / pruning policy (G3 operational concern)
- How `DiffPRSummaryExport` is consumed by G2-1 for comment re-posting
  (G2 integration layer)
