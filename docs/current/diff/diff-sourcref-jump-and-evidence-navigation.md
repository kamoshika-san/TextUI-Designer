# Diff sourceRef Jump and Evidence Navigation

Updated: 2026-03-29
Owner: Maintainer
Related ticket: `T-20260328-188`

## Purpose

This document defines the navigation contract for jumping from a diff finding back
to its source reference and supporting evidence.  It determines what the review
surface must provide, what is optional, and how to behave when source information
is unavailable.

It is consumed by:
- G1-1 `review-oriented` mode (which renders the reviewer-facing output)
- downstream view layers that expose evidence links

It does not define:
- how navigation is rendered in a specific surface (terminal vs. IDE vs. PR comment)
- G2 PR surface link generation

---

## 1. Input: what sourceRef data is available

`DiffReviewerEvidence` (defined in G1-2) carries:

```ts
interface DiffReviewerEvidence {
  previous?: { documentPath?: string; entityPath: string; };
  next?: { documentPath?: string; entityPath: string; };
}
```

`DiffEventTrace` (from C3-2) carries:
- `reasonSummary` — human-readable reason string
- `pairingClass` / `pairingReason` / `fallbackMarker` — classification signals

These are the only evidence inputs available at the time of G1 view-model construction.
Raw `DiffCompareResult` must not be re-accessed at presentation time.

---

## 2. sourceRef jump — minimum requirements

A sourceRef jump is considered satisfiable when **at least one of** the following is true:

| Condition | Satisfiable? |
|---|---|
| `documentPath` is present on the relevant side | Yes — full jump (file + path) |
| only `entityPath` is present (no `documentPath`) | Partial — path-only jump |
| neither `documentPath` nor `entityPath` is present | Not satisfiable — silent fallback |

**Minimum contract**:
- If `documentPath` is present: the navigation slot carries `<documentPath>#<entityPath>`.
- If only `entityPath` is present: the navigation slot carries `<entityPath>` only (no file link).
- If absent: the slot is omitted entirely.  The reviewer surface must not show a broken link.

---

## 3. Navigation slots

Three navigation slots are distinguished.  Each has a separate renderability contract.

### 3.1 Primary sourceRef jump

- **What**: Jump to the entity location in the source document.
- **Input**: `DiffReviewerEvidence.previous` or `.next` (whichever is relevant to the event kind).
- **Requirement**: Renderable when at least `entityPath` is present.
- **Format**: `<documentPath>#<entityPath>` or `<entityPath>` (path-only).

### 3.2 Evidence trace snippet

- **What**: The human-readable reason why this diff was classified this way.
- **Input**: `DiffEventTrace.reasonSummary` (from C3-2 diagnostics).
- **Requirement**: Always renderable — `reasonSummary` is always a non-empty string.
- **Format**: Inline text; no navigation link.
- **Note**: This slot is for the reviewer surface only.  It must not surface in machine-readable output.

### 3.3 Extension hook slot

- **What**: A reserved slot for downstream hook systems (D2-2 refinement hooks) to attach additional evidence.
- **Input**: Extension hook metadata (if present); otherwise empty.
- **Requirement**: Optional.  Renderable only when hook metadata is attached.
- **Format**: Defined by the hook provider; not constrained here.

---

## 4. Degraded behavior

When source information is partially or fully unavailable, the surface degrades silently.

| Situation | Behavior |
|---|---|
| `documentPath` absent | Show path-only link; do not show a broken file link |
| `entityPath` absent | Omit the sourceRef slot entirely |
| Both absent | Show only the evidence trace snippet (reasonSummary) |
| `reasonSummary` empty (should not occur) | Show the `pairingClass` label as a fallback |
| Hook slot not populated | Omit the extension hook slot silently |

**Key rule**: Never render a broken or `undefined` link in the reviewer surface.
Silent omission is always preferred over a visible error.

---

## 5. Relationship to G1-2 DiffReviewerEvidence

`DiffReviewerEvidence.previous/next` carries `documentPath` (optional) and `entityPath` (required
when the side is present).  This is sufficient for slots 3.1 and is intentionally minimal.

If a future G1-3 follow-up determines that additional fields (e.g., line number, column) are
needed for IDE-level navigation, they should be added as optional fields on `DiffReviewerEvidence`
in a backwards-compatible way — not by adding a parallel evidence type.

---

## 6. What this document does NOT define

- Line/column level navigation (out of scope for G1-3; potential G2+ enhancement)
- How `documentPath` is resolved to an absolute file path at runtime (consumer responsibility)
- PR comment link format (G2 surface work)
- Navigation for the machine-readable mode (E1 schema work)
