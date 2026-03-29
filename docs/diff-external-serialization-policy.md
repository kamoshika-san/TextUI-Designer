# Diff External Serialization Policy (E1-2)

Updated: 2026-03-29
Owner: Maintainer
Related ticket: `T-20260328-174`

## Purpose

This document defines how reason trace data (C3-2 `DiffDiagnosticsResult`) and
semantic summary payload (D2-3 `DiffNarrativeResult`) are represented in external
output.

It determines:
- which fields may appear in external payloads
- which fields must be omitted or abstracted
- how the `diff-result-external/v0` schema (E1-1) relates to these surfaces
- the versioning and extension policy for each surface

It does not define:
- the external schema for these surfaces (that is an E1-3/E2 implementation concern)
- rendering format (D3-2/D3-3)
- internal runtime representation (which remains as-is in C3-2 / D2-3)

---

## 1. Surfaces in scope

| Surface | Source type | External inclusion |
|---|---|---|
| Reason trace (diagnostics) | `DiffDiagnosticsResult` / `DiffEventTrace` | Optional diagnostic extension |
| Summary payload (narrative) | `DiffNarrativeResult` / `DiffNarrativeGroup` | Core summary extension |
| Base diff events | `DiffResultExternal.events[]` | Already in E1-1 schema |

---

## 2. Reason trace — external representation rules

`DiffEventTrace` (C3-2) carries:
- `eventId`, `eventKind`, `pairingClass`, `pairingReason`, `fallbackMarker`,
  `fallbackConfidence`, `reasonSummary`, `hasFallback`

**External inclusion policy:**

| Field | External? | Rule |
|---|---|---|
| `eventId` | Yes | Stable reference key; always include when trace is present |
| `eventKind` | Yes | Already in base events; redundant but acceptable for trace locality |
| `pairingClass` | Yes | Contract-stable coarse classifier |
| `pairingReason` | Yes | Already in E1-1 base events |
| `fallbackMarker` | Yes | Already in E1-1 base events |
| `fallbackConfidence` | Yes | Informational; include |
| `reasonSummary` | Yes | Human-readable; safe to include |
| `hasFallback` | No | Derived from fallbackMarker; omit (redundant) |

**Diagnostic surface placement:**

Trace data must NOT be embedded inside individual `events[]` entries in the
E1-1 base schema.  Instead, it is placed in a **separate top-level extension
field** `diagnostics` (optional):

```json
{
  "kind": "textui-diff-result-external",
  "schemaVersion": "diff-result-external/v0",
  "events": [ ... ],
  "diagnostics": {
    "traces": [
      {
        "eventId": "...",
        "pairingClass": "deterministic",
        "reasonSummary": "paired by explicit id, identity:explicit-id"
      }
    ],
    "summary": {
      "deterministicCount": 8,
      "heuristicCount": 1,
      "unpairedCount": 0,
      "fallbackCount": 1
    }
  }
}
```

The `diagnostics` field is **opt-in**.  CI and machine-readable consumers that do
not request diagnostic output receive a payload without this field.

---

## 3. Summary payload — external representation rules

`DiffNarrativeResult` (D2-3) carries:
- `groups[]`: axis, highestSeverity, narrative, items[]
- `metadata`: totalGroups, totalItems, highestSeverity, containsAmbiguity, containsHeuristic

**External inclusion policy:**

| Field | External? | Rule |
|---|---|---|
| `groups[].axis` | Yes | Stable axis enum |
| `groups[].highestSeverity` | Yes | Stable severity enum |
| `groups[].narrative` | Yes | Human-readable paragraph; safe |
| `groups[].items[].eventId` | Yes | Traceability |
| `groups[].items[].summaryKey` | Yes | Stable formatter key |
| `groups[].items[].severity` | Yes | Stable enum |
| `groups[].items[].label` | Yes | Human-readable label |
| `groups[].items[].heuristicDerived` | Yes | Reviewer uncertainty signal |
| `groups[].items[].ambiguityMarker` | Yes | Conservative fallback signal |
| `groups[].items[].ruleTrace` | Conditional | Developer/diagnostic output only; omit in production summary payloads |
| `metadata.*` | Yes | All metadata fields are safe |

**Summary surface placement:**

The summary payload is placed in a **separate top-level extension field** `summary`
(optional, output when `--mode review-oriented` or equivalent):

```json
{
  "kind": "textui-diff-result-external",
  "schemaVersion": "diff-result-external/v0",
  "events": [ ... ],
  "summary": {
    "groups": [
      {
        "axis": "ambiguity",
        "highestSeverity": "s3-critical",
        "narrative": "**Ambiguity** — 1 item, 1 critical.",
        "items": [
          {
            "eventId": "...",
            "summaryKey": "ambiguity.remove-add-fallback",
            "severity": "s3-critical",
            "label": "Entity replaced (conservative fallback)",
            "heuristicDerived": false,
            "ambiguityMarker": true
          }
        ]
      }
    ],
    "metadata": { ... }
  }
}
```

`ruleTrace` is excluded from production summary payloads.  It may be included in
`diagnostics.traces[].reasonSummary` which already serves the same purpose in a
more compact form.

---

## 4. Schema extension policy

The E1-1 base schema (`diff-result-external/v0`) uses
`"additionalProperties": false` on the root object.  Adding `diagnostics` and
`summary` fields requires a **schema amendment**.

**Policy**:
- `diagnostics` and `summary` are **optional extension fields** added to the
  E1-1 root schema in a minor-compatible amendment (no schemaVersion bump required
  because they are additive optional fields).
- Both fields use `"additionalProperties": false` on their own sub-schemas to
  prevent internal field leak.
- `ruleTrace` must not appear in any sub-schema that is enabled by default.

This amendment is the responsibility of the E1-3 / E2 implementation phase.
E1-2 only defines the policy; the schema update happens in a separate ticket.

---

## 5. Internal fields that must NEVER appear externally

| Field | Source | Reason |
|---|---|---|
| `DiffCompareDocument` (raw) | Epic C | Internal IR; consumer must not access |
| `DiffEntityResult.metadata.traversalOrder` | Epic C | Implementation detail |
| `DiffEntityResult.children[]` (raw tree) | Epic C | Replaced by flat `events[]` |
| `DiffNarrativeItem.ruleTrace` | D2-3 | Developer/diagnostic only |
| `DiffEventTrace.hasFallback` | C3-2 | Derived field; redundant |

---

## 6. Compatibility with E3 strategy

E3 will define cross-version upgrade paths.  This policy is E1-scoped:

- Fields marked "Yes" in the tables above are **stable** and may be relied upon
  by consumers within the `diff-result-external/v0` lifetime.
- `diagnostics` and `summary` extension fields are **opt-in** and must be
  treated as non-guaranteed by consumers who do not request them.
- Breaking changes (field removal, semantic reinterpretation) will require a
  schemaVersion bump per the E1-1 versioning contract.
