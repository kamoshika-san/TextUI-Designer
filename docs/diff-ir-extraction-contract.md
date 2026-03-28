# Diff IR Extraction Contract

Updated: 2026-03-28
Owner: Maintainer
Related ticket: `T-20260328-122`

## Background

The Diff IR vocabulary defines what the comparison model contains. The next requirement is a stable contract for how DSL input becomes that IR.

This page defines the extraction-layer boundary between raw DSL documents and the comparison IR. The goal is to keep extraction, normalization, and diff responsibilities separate so later phases do not leak concerns across layers.

## Scope

This page covers:

- extraction inputs
- extraction outputs
- required source-mapping payload
- what extraction must preserve for later normalization and diff
- what extraction must not decide on behalf of normalization or diff

This page does not define:

- normalization rules
- identity-key priority
- similarity matching
- diff-event naming
- reviewer-facing summary generation

## Requirements

### 1. Input contract

The extraction layer accepts parsed DSL documents plus the minimal context required to preserve review traceability.

Required input categories:

- parsed DSL object tree
- document path or workspace-relative identifier
- parser diagnostics or recoverable parse warnings when available
- include or source-origin metadata when the DSL is assembled from multiple files

The extraction layer should consume already-parsed DSL structures, not raw DSL text.

### 2. Output contract

The extraction layer outputs one comparison-ready IR payload whose vocabulary follows `docs/diff-ir-vocabulary.md`.

Required output properties:

- one IR root for the requested DSL document
- screen entries and structural nodes expressed in canonical IR field names
- state, event, and transition records when present in the source DSL
- source references attached to every reviewable IR unit
- preservation of explicit author intent even when it looks redundant

Extraction may normalize names into canonical field labels only when that conversion is lossless and vocabulary-level, not meaning-level.

### 3. Extraction responsibilities

Extraction is responsible for:

- mapping DSL constructs into the correct IR unit type
- preserving source location and origin metadata
- preserving ordering information exactly as authored where later layers may need it
- preserving explicit values, even when they may later collapse through normalization
- carrying enough metadata for reviewer jump-back and future visual correlation

Extraction is not responsible for:

- removing redundant fields
- expanding defaults
- reordering collections into canonical order
- deciding whether two authored forms are semantically equivalent
- classifying severity or review importance

### 4. Source reference contract

Every reviewable IR unit must include a source reference payload.

Minimum source reference fields:

- document identifier
- source range, line/column pair, or equivalent stable location
- DSL object path or ownership path when available

If the source object is composed from included files, the extraction layer should preserve both:

- current effective document reference
- original source origin when different

The extraction layer must not discard sourceRef data even if later normalization merges equivalent values.

### 5. Ordering contract

Extraction must preserve authored order for any collection that may later participate in:

- reorder detection
- move detection
- reviewer-facing change explanation

Examples:

- child node arrays
- state lists
- transition lists
- property collections where authored order may be meaningful before canonicalization is applied

Canonical reordering belongs to normalization, not extraction.

### 6. Explicit-vs-derived value contract

Extraction must preserve the distinction between:

- values explicitly authored in the DSL
- values absent from the DSL

This distinction matters because normalization may later choose to expand defaults, and reviewer tooling may still need to know whether a value was originally explicit.

Recommended extraction behavior:

- keep explicit values as explicit IR entries
- represent absence as absence, not as synthesized defaults
- carry optional metadata flags when later phases need to know whether a value was explicit

### 7. Layer handoff to normalization

The normalization layer receives IR that is structurally typed but not yet canonically shaped.

Extraction must hand off:

- the full authored ordering
- explicit authored values
- source references
- enough structural shape to support later canonicalization

Extraction must avoid handing off:

- partially normalized fields that mix authored and canonical states
- diff-specific annotations
- guessed identity matches between separate nodes

### 8. Layer handoff to diff

The structural diff layer should never need to reconstruct authored source structure that extraction already knew.

Therefore extraction must preserve:

- stable IR unit typing
- sourceRef
- authored order
- authored explicitness

Normalization may transform shape, but extraction must provide the raw comparison substrate that makes those later choices reversible and explainable.

## Non-Functional Notes

- The contract should be implementation-neutral so CLI, extension host, and future PR tooling can emit the same IR shape.
- Source traceability is a first-class requirement because Diff UI and AI review assistance both need reliable jump-back context.
- The extraction layer should favor transparent data preservation over premature cleanup.

## Constraints

- Extraction must not become a hidden normalization pass.
- Extraction must not erase authored ordering before normalization rules are decided.
- Extraction must not synthesize reviewer text or semantic labels.
- Extraction may only rename fields into IR vocabulary terms when the transformation is mechanically lossless.

Open follow-up dependencies:

- `T-20260328-123` defines identity-key priority.
- `T-20260328-135` and `T-20260328-136` refine normalization-stage boundaries using this extraction contract.
- `T-20260328-137` and later tickets decide where canonical ordering begins.

## Verification

- Confirm each IR unit defined in `docs/diff-ir-vocabulary.md` can be reached from a DSL extraction path without introducing normalization logic.
- Confirm source references survive for screens, structural nodes, properties, states, events, and transitions.
- Confirm authored order is preserved at extraction time rather than rewritten into canonical order.
- Confirm explicit-vs-absent values remain distinguishable after extraction.

## Change History

- 2026-03-28: Initial extraction contract for Diff Engine Epic A / Sprint A1 / `T-20260328-122`.
