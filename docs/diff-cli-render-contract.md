# Diff CLI Render Contract (E2-1)

Updated: 2026-03-29
Owner: Maintainer
Related ticket: `T-20260328-176`

## Purpose

This document defines the CLI rendering contract for diff results.  It
determines how `DiffResultExternal` and optional extension fields
(`diagnostics`, `summary`) are formatted for terminal output, what the
concise vs verbose modes produce, and what the CLI must never read directly.

It specifies:
- the CLI render input contract
- concise and verbose output modes
- how severity, grouping, and trace reference are rendered in terminal output
- the invariant that CLI never reads raw internal types

It does not specify:
- PR comment rendering (D3-2)
- JSON artifact output format (E2-2)
- how the diff is triggered from the CLI (G1-1 mode contract)
- ANSI color code values or terminal capability detection

---

## 1. CLI render input contract

The CLI renderer accepts only types from the external contract layer.  It must
**not** import from `textui-core-diff.ts` or any other Epic C internal module.

```ts
interface DiffCLIRenderInput {
  /** External diff result (required). */
  result: DiffResultExternal;
  /**
   * Optional diagnostics extension (opt-in via --diagnostics flag).
   * Presence triggers verbose trace output.
   */
  diagnostics?: DiffDiagnosticsExternal;
  /**
   * Optional narrative summary (opt-in via --review-oriented flag).
   * Presence triggers summary group output.
   */
  summary?: DiffNarrativeSummaryExternal;
  /** Render mode. Default: 'concise'. */
  mode: 'concise' | 'verbose';
}
```

`DiffDiagnosticsExternal` and `DiffNarrativeSummaryExternal` are the external
representations defined in the E1-2 serialization policy.

---

## 2. Concise mode output

Concise mode produces a compact terminal summary.  It is the default mode and
is suitable for CI logs and scripted consumers.

**Structure:**

```
TextUI Diff  ·  <N> event(s)  ·  <signal>

  [<severity icon>] <kind>  <entityKind>  <previousPath → nextPath>

... <M> more events (use --verbose for full list)
```

- Maximum **10 events** shown in concise mode.  Remaining count reported.
- Events shown in order: s3-critical first, then by `kind` (add, remove, update, rename, reorder, move, remove+add).
- `signal` is derived from `DiffResultExternal.metadata` and optional summary:
  - `FAIL` when any `fallbackMarker === 'remove-add-fallback'` (indicates ambiguity)
  - `WARN` when any `fallbackMarker === 'heuristic-pending'`
  - `OK` otherwise

**Path rendering:**

| Event kind | Path shown |
|---|---|
| add | `→ <nextPath>` |
| remove | `<previousPath> →` |
| update / rename / reorder / move | `<previousPath> → <nextPath>` |
| remove+add | `<previousPath> → <nextPath>` (with ⚠ prefix) |

---

## 3. Verbose mode output

Verbose mode shows all events plus optional trace and summary sections.

**Structure:**

```
TextUI Diff  ·  <N> event(s)  ·  <signal>
Producer: <engine> <engineVersion>  Stage: <compareStage>

Events:
  [<severity icon>] <eventId>  <kind>  <entityKind>
    Previous: <previousPath>
    Next:     <nextPath>
    Pairing:  <pairingReason>  [<fallbackMarker>]

[Summary section — only when summary is present]
  Groups (<M> groups, highest: <severity>):
    [<axis>] <highestSeverity>
      <narrativeParagraph>
      - <severity icon> <label>  <eventId>  [heuristic]  [ambiguous]

[Diagnostics section — only when diagnostics is present]
  Diagnostics:
    Counts: deterministic=<N> heuristic=<N> unpaired=<N> fallback=<N>
    Traces:
      <eventId>  <pairingClass>  <reasonSummary>
```

---

## 4. Severity icon mapping (terminal)

| severity | Icon text |
|---|---|
| s3-critical | `[CRIT]` |
| s2-review | `[REVW]` |
| s1-info | `[INFO]` |
| s0-minor | `[MINR]` |

No ANSI color codes are defined here.  The renderer may apply color based on
terminal capability, but the icon text must be present regardless of color
support.

---

## 5. Invariant: no internal type access

The CLI renderer must satisfy the following invariant at compile time:

> No file in the CLI render path may import from `src/core/textui-core-diff.ts`
> or any type that is not exported from `src/core/textui-diff-result-external.ts`.

This is enforced by the E1-3 projection boundary: all diff data reaching the
CLI surface must pass through `buildDiffResultExternal()`.

---

## 6. Renderer function signature

```ts
function renderDiffCLI(input: DiffCLIRenderInput): string
```

Returns a single string (no side effects).  The caller (G1-1 command pipeline)
is responsible for writing the string to stdout.

---

## 7. Relationship to other render surfaces

| Surface | Input type | Format |
|---|---|---|
| CLI (this doc) | `DiffCLIRenderInput` | Plain text / ANSI terminal |
| PR comment | `DiffPRCommentPayload` | GitHub-flavored markdown |
| JSON artifact | `DiffResultExternal` | Raw JSON |
| Check-run title | `DiffCheckRunResult` | One-line string |

CLI rendering is independent of PR comment rendering (D3-2).  They share the
same upstream data but consume different intermediate types.

---

## 8. What this document does NOT define

- ANSI escape codes or terminal color palette
- How `DiffDiagnosticsExternal` / `DiffNarrativeSummaryExternal` are typed (E2 schema)
- JSON artifact output path and filename (E2-2)
- CLI argument parsing or flag names (G1-1)
