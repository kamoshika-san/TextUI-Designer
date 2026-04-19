# Diff Result External Projection Design (E1-3)

Updated: 2026-03-29
Owner: Maintainer
Related ticket: `T-20260328-175`

## Purpose

This document defines the projection layer that converts an internal
`DiffCompareResult` (Epic C) into the external contract payload
`DiffResultExternal` (E1-1).

It specifies:
- where the projection boundary sits in the pipeline
- which internal fields are stripped and which are mapped to external fields
- the opt-in diagnostics surface attachment point
- the function signature and caller contract

It does not specify:
- rendering or output formatting (D3-x)
- CLI flag parsing or mode dispatch (G1-1)
- the external JSON Schema itself (E1-1)
- the serialization field-level policy (E1-2)

---

## 1. Projection boundary

```
DiffCompareResult          ← Epic C internal type (never exposed to consumers)
        ↓
buildDiffResultExternal()  ← E1-3 projection function (this document)
        ↓
DiffResultExternal         ← E1-1 external contract type
   + diagnostics?          ← C3-2 DiffDiagnosticsResult (opt-in, E1-2 policy)
   + summary?              ← D2-3 DiffNarrativeResult   (opt-in, E1-2 policy)
```

The projection function is the **sole authorized path** from internal result to
external payload.  No caller may directly serialize `DiffCompareResult` or any
sub-field of it.

---

## 2. Projection function signature

```ts
interface DiffExternalProjectionOptions {
  /** Producer metadata supplied by the caller (CLI / adapter). */
  producer: DiffResultProducer;
  /**
   * When true, attach a `diagnostics` extension field built from
   * buildDiffDiagnostics(result).  Default: false.
   */
  includeDiagnostics?: boolean;
  /**
   * When provided, attach a `summary` extension field from the caller-supplied
   * DiffNarrativeResult.  The projection layer does not run D2-x logic itself.
   * Default: undefined (field omitted).
   */
  narrativeResult?: DiffNarrativeResult;
}

function buildDiffResultExternal(
  result: DiffCompareResult,
  options: DiffExternalProjectionOptions
): DiffResultExternal & {
  diagnostics?: DiffDiagnosticsExternal;
  summary?: DiffNarrativeSummaryExternal;
}
```

The return type is a `DiffResultExternal` base plus optional extension fields.
The extension fields are additive and optional per the E1-2 schema extension
policy (no `schemaVersion` bump required).

---

## 3. Event mapping: DiffCompareResult → DiffExternalEvent[]

Each `DiffEvent` in `DiffCompareResult.events[]` maps to one `DiffExternalEvent`:

| DiffEvent field | DiffExternalEvent field | Notes |
|---|---|---|
| `eventId` | `eventId` | Direct pass-through |
| `eventKind` | `kind` | Renamed; enum values are identical in mapping |
| `entityKind` (derived from entity type) | `entityKind` | `'page' \| 'component' \| 'property'` |
| `trace.pairingReason` | `pairingReason` | Mapped to `DiffExternalPairingReason` vocabulary |
| `trace.fallbackMarker` | `fallbackMarker` | Mapped to `DiffExternalFallbackMarker` vocabulary |
| `previous.path` (optional) | `previousPath` | Omitted for 'add' events |
| `next.path` (optional) | `nextPath` | Omitted for 'remove' events |

**Fields stripped at the projection boundary (must not appear in output):**

| DiffEvent field | Reason for exclusion |
|---|---|
| `entity.metadata.traversalOrder` | Implementation detail (C-internal) |
| `entity.children[]` | Replaced by flat `events[]`; raw tree must not leak |
| `previous.document` / `next.document` | Full `DiffCompareDocument` must not be exposed |
| `trace.identitySource` | Internal scoring detail; not in E1-1 contract |
| `trace.hasFallback` | Derived from `fallbackMarker`; redundant (E1-2 policy) |

---

## 4. Metadata mapping

| DiffCompareResult field | DiffExternalMetadata field |
|---|---|
| `events.length` | `eventCount` |
| `previous.sourceRef.pageId` | `previousSource.pageId` |
| `previous.sourceRef.sourcePath` | `previousSource.sourcePath` (optional) |
| `next.sourceRef.pageId` | `nextSource.pageId` |
| `next.sourceRef.sourcePath` | `nextSource.sourcePath` (optional) |

---

## 5. Diagnostics surface attachment

When `options.includeDiagnostics === true`, the projection calls
`buildDiffDiagnostics(result)` (C3-2) and maps the result to a
`DiffDiagnosticsExternal` shape placed at `payload.diagnostics`.

Per the E1-2 serialization policy:
- `diagnostics` is a separate top-level field, **not** embedded in `events[]`.
- `DiffEventTrace.hasFallback` is excluded.
- All other `DiffEventTrace` fields map 1:1 to `diagnostics.traces[].` fields.
- `diagnostics.summary` carries the aggregate counts from `DiffDiagnosticsSummary`.

When `options.includeDiagnostics` is false or absent, the `diagnostics` field
is **not present** on the output object (no `null` placeholder).

---

## 6. Summary surface attachment

When `options.narrativeResult` is provided, the projection maps it to a
`DiffNarrativeSummaryExternal` shape placed at `payload.summary`.

Per the E1-2 serialization policy:
- `summary` is a separate top-level field.
- `DiffNarrativeItem.ruleTrace` is **excluded** from all production summary payloads.
- All other `DiffNarrativeGroup` and `DiffNarrativeItem` fields map 1:1.

The projection layer does **not** run D2-x classification or narrative assembly.
The caller (G1-1 compare command pipeline) assembles the `DiffNarrativeResult`
from D2-x and passes it via `options.narrativeResult`.

---

## 7. Invariants enforced by the projection layer

1. **No internal type leak** — the output object must satisfy `DiffResultExternal`
   and must not carry any field from `DiffCompareResult` that is not listed in
   section 3 or 4.
2. **Opt-in only** — `diagnostics` and `summary` appear only when explicitly
   requested via `options`.
3. **Schema-compatible output** — the returned object must validate against
   `schemas/diff-result-external-v0.json` (plus the E1-2 schema amendment for
   optional extension fields once that amendment is applied).
4. **Producer metadata is caller-supplied** — the projection function does not
   read `package.json` or any runtime config; the caller provides the
   `DiffResultProducer` value.

---

## 8. Caller contract

The projection function is called from the G1-1 compare command pipeline:

```
G1-1 compareDocuments()
  ↓ DiffCompareResult
  → buildDiffResultExternal(result, {
      producer: { engine: 'textui-diff-core', engineVersion, compareStage },
      includeDiagnostics: flags.diagnostics,
      narrativeResult: flags.reviewOriented ? narrativeResult : undefined
    })
  ↓ DiffResultExternal (+ optional extensions)
  → serialize to JSON / pass to renderer
```

The projection layer has no knowledge of output format (JSON, ANSI, markdown).
It produces a plain object; serialization is performed downstream.

---

## 9. What this document does NOT define

- The `DiffDiagnosticsExternal` and `DiffNarrativeSummaryExternal` type shapes
  (these are the E2 implementation concern that amends the E1-1 schema)
- Validation logic against the JSON Schema (E2 / integration adapter concern)
- The `buildDiffDiagnostics` implementation (C3-2)
- The `assembleSummaryNarrative` implementation (D2-3)
