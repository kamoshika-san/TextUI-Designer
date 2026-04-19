# Diff Heuristic Sample Catalog (H1-1 / H1-2 / H1-3)

Updated: 2026-03-29
Owner: Maintainer
Related tickets: `T-20260328-212` (H1-1), `T-20260328-213` (H1-2), `T-20260328-214` (H1-3)

## Purpose

This document catalogs the heuristic rescue input samples, similarity signal
inventory, and forbidden-zone negative controls for Epic H.

It specifies:
- which AI-noise taxonomy buckets (N1–N6, P1–P5) are heuristic rescue candidates
- which signals are supportive vs decisive-prohibited in similarity scoring
- representative forbidden-zone samples and multi-candidate negative controls

It does not specify:
- similarity scoring implementation or threshold values (H2-x)
- how samples are stored as test fixtures (J2-1)
- normalization rules for AI noise (existing `diff-ai-noise-fixture-mapping.md`)

---

## Part 1 — H1-1: AI-Noise Heuristic Sample Catalog

### 1.1 Taxonomy re-interpretation for heuristic rescue

The N1–N6 / P1–P5 taxonomy from `diff-ai-noise-fixture-mapping.md` classifies
AI-generated noise from a *normalization* perspective.  For heuristic rescue,
the same taxonomy is re-interpreted from a *diff continuity* perspective:

| Bucket | Normalization view | Heuristic rescue view |
|---|---|---|
| N1 | Normalizable — canonical alias collapse | Rescue candidate — same entity, surface alias changed |
| N2 | Normalizable — canonical primitive typing | Rescue candidate — same entity, type representation changed |
| N3 | Normalizable — canonical shorthand projection | Rescue candidate — same entity, shorthand vs explicit |
| N4 | Normalizable — wrapper-free canonical shape | Rescue candidate — same entity, wrapper structure changed |
| N5 | Normalizable — explicit default collapse | Rescue candidate — same entity, default explicitness changed |
| N6 | Normalizable — redundant duplicate pruned | Rescue candidate — same entity, duplicate collapsed |
| P1 | Preserved — structure must differ | Non-rescue — genuine structural change, must remain visible |
| P2 | Preserved — undocumented alias must stay | Non-rescue — alias difference is meaningful, do not fold |
| P3 | Preserved — context-sensitive default | Non-rescue — context changes meaning, do not rescue |
| P4 | Preserved — free-text paraphrase | Non-rescue — wording change is semantic, do not rescue |
| P5 | Preserved — ownership flattening | Non-rescue — ownership change is structural, never rescue |

### 1.2 N-bucket rescue sample layout

Each N-bucket rescue sample is a pair of TextUI IR snapshots where the entity
is the *same* conceptual component despite surface-level AI-generated drift:

**N1 (alias collapse rescue):**
- Previous: `{ kind: "Button", label: "submit-button" }`
- Next: `{ kind: "Button", name: "submit-button" }` (key alias changed by AI)
- Expected outcome: heuristic rescue applied → `update` event, not `remove+add`
- Required conditions: same parent, same kind, same screen

**N3 (shorthand projection rescue):**
- Previous: `{ kind: "Field", type: { name: "text" } }`
- Next: `{ kind: "Field", type: "text" }` (shorthand form after AI regeneration)
- Expected outcome: heuristic rescue applied → `update` or no-change

**N4 (wrapper-free rescue):**
- Previous: `{ kind: "Container", children: [{ kind: "Button" }] }`
- Next: `{ kind: "Button" }` (wrapper removed by AI, button promoted to scope)
- Expected outcome: depends on scope — if within same parent, rescue candidate; if cross-parent, forbidden

### 1.3 P-bucket non-rescue sample layout

**P4 (free-text paraphrase — must not rescue):**
- Previous: `{ kind: "Button", label: "Submit" }`
- Next: `{ kind: "Button", label: "Send" }` (AI paraphrased the label)
- Expected outcome: `update` event on the property, NOT heuristic identity rescue at entity level

**P5 (ownership flattening — must not rescue):**
- Previous: `{ kind: "Form", children: [{ kind: "Button", key: "submit" }] }`
- Next: `{ kind: "Button", key: "submit" }` (moved out of Form by AI)
- Expected outcome: `move` event or `remove+add`; heuristic must not claim same-parent continuity

---

## Part 2 — H1-2: Similarity Signal Inventory

### 2.1 Supportive signals

These signals may contribute to a heuristic rescue score when present.
No single signal is sufficient to force a rescue.

| Signal | Description | Weight class |
|---|---|---|
| `canonical-kind` | Old and new entity share the same canonical kind | High |
| `owner-scope` | Old and new entities share the same parent/owner scope | High |
| `property-shape` | Non-volatile canonical property set is similar (≥2 matching fields) | Medium |
| `slot-placement` | Entity occupies the same structural slot in parent | Medium |
| `event-anchor` | State/event/transition records share the same anchoring owner | Medium |
| `fallback-key-match` | Shared value for a FALLBACK_IDENTITY_KEY field | High |

The scoring threshold (how many signals trigger rescue) is defined in H2-1.

### 2.2 Decisive-prohibited signals

These signals must **never** force a rescue on their own, and must contribute
zero weight when they are the only evidence:

| Signal | Reason for prohibition |
|---|---|
| `display-text-similarity` | AI paraphrase / translation noise; not identity |
| `label-match` | Label text is volatile; matches P4 bucket |
| `placeholder-match` | Placeholder is user-facing copy; AI-regenerated frequently |
| `sibling-ordinal` | Position alone cannot imply continuity across versions |
| `visual-resemblance` | Inferred from semantics not present in IR |

### 2.3 Boundary condition: volatile vs non-volatile properties

**Non-volatile** (may contribute to signal): `kind`, `key`, `name`, `route`,
`event`, `state`, `transition`, layout anchors, type definitions.

**Volatile** (prohibited from being sole signal): display text fields
(`label`, `placeholder`, `hint`, `title`, `description`), dynamically
generated IDs.

This boundary aligns with the `FALLBACK_IDENTITY_KEYS` definition in Epic C
and the forbidden-zone rule in `diff-similarity-matching-boundary.md`.

---

## Part 3 — H1-3: Forbidden-Zone Samples and Negative Controls

### 3.1 Forbidden-zone representative cases

| Case ID | Description | Why forbidden |
|---|---|---|
| FZ-01 | Button in screen A vs similar button in screen B | Cross-screen boundary |
| FZ-02 | Input field promoted out of Form wrapper to sibling level | Cross-parent scope (P5 bucket) |
| FZ-03 | Text input replaced by select with same label | Kind change — `Field(type:text)` vs `Field(type:select)` |
| FZ-04 | Same label text in two different containers | Display-text-only similarity (prohibited signal) |
| FZ-05 | Navigation item in Header vs similar item in Footer | Different owner scope (cross-parent) |
| FZ-06 | Component regenerated in a different subtree with similar property | Same-kind but cross-parent — no structural anchor |

### 3.2 Multi-candidate negative controls

These cases must produce `remove+add` (not heuristic rescue) because multiple
plausible candidates exist after bounded filtering:

| Case ID | Description | Expected result |
|---|---|---|
| MC-01 | Three similar buttons in same parent, one removed | Ambiguity → `remove+add` for removed item |
| MC-02 | Two matching state records in same transition owner, one disappears | Ambiguity → `remove+add` |
| MC-03 | Renamed component where sibling has similar profile too | Multiple candidates → decline rescue |

**Contract for multi-candidate handling:**

When ≥2 candidates survive bounded filtering, the engine must:
1. Decline heuristic rescue for all candidates involved.
2. Fall back to `remove+add` for the unmatched entity.
3. Emit `fallbackMarker: 'remove-add-fallback'` and `DiffFallbackConfidence: 'not-applicable'`.
4. Preserve enough trace metadata to surface the ambiguity to reviewers.

### 3.3 Negative baseline summary

The following inputs must never trigger heuristic rescue:

1. Any case where the only similarity is display text (labels, placeholders)
2. Any case crossing screen boundaries
3. Any case crossing parent scope in a way that implies a move
4. Any case where kind changes
5. Any case with ≥2 equally plausible candidates

These correspond to the forbidden zones in `diff-similarity-matching-boundary.md`
and the P4/P5 non-rescue buckets from H1-1.

---

## What this document does NOT define

- Scoring thresholds or confidence tiers (H2-1)
- Tie-break policy for near-equal candidates (H2-2)
- Heuristic trace and reviewer audit surface (H2-3)
- Fixture storage format (J2-1)
