# Diff IR Spec And Developer Guide

Updated: 2026-03-28
Owner: Maintainer
Related ticket: `T-20260328-129`

## Purpose

This document is the current developer entry point for the Diff IR work in Epic A. It consolidates the settled design decisions from Sprint A1, Sprint A2, and the completed part of Sprint A3 into one guide so PM, Developer, Reviewer, and downstream feature work can reason from the same structure.

This is not a replacement for the source policy documents. It is the navigation layer that explains how they fit together and where future work should attach.

## Current Status

Settled inputs covered here:

- IR vocabulary
- extraction contract
- identity-key priority
- reorder versus move boundary
- rename versus remove-plus-add boundary
- similarity-matching boundary
- state / event / transition / permission extension hooks

Pending inputs not yet final in this guide:

- acceptance scenario matrix from `T-20260328-128`
- any later semantic-diff wording
- any implementation-specific runtime schema

Where this guide references pending areas, it marks them explicitly instead of guessing final conclusions.

## Document Map

The current canonical source documents are:

- `docs/diff-ir-vocabulary.md`
- `docs/diff-ir-extraction-contract.md`
- `docs/diff-ir-identity-policy.md`
- `docs/diff-reorder-move-policy.md`
- `docs/diff-rename-removeadd-policy.md`
- `docs/diff-similarity-matching-boundary.md`
- `docs/diff-ir-extension-points.md`

Use this guide to understand the flow across those documents. Use the source documents to inspect the exact rule text.

## Layered Model

### 1. Vocabulary layer

`docs/diff-ir-vocabulary.md` defines the comparison units:

- IR root
- screen
- structural node
- property entry
- state variant
- event
- transition
- source reference

This layer answers "what exists in the comparison model".

### 2. Extraction layer

`docs/diff-ir-extraction-contract.md` defines how parsed DSL becomes comparison-ready IR.

This layer answers:

- what extraction receives
- what extraction must preserve
- what extraction must not decide early

Key rule:

- extraction preserves authored structure, source traceability, and explicitness
- extraction does not perform hidden normalization or semantic interpretation

### 3. Deterministic identity layer

`docs/diff-ir-identity-policy.md` defines primary and deterministic fallback identity.

This layer answers:

- how screens, nodes, states, events, and transitions establish same-entity continuity
- which fields cannot be used as authoritative identity

Key rule:

- visible text may support review context, but does not rescue identity by itself

### 4. Structural classification layer

Two documents define the main deterministic structural boundaries:

- `docs/diff-reorder-move-policy.md`
- `docs/diff-rename-removeadd-policy.md`

These documents answer:

- when continuity remains reorder versus move
- when wording change remains property update
- when rename is acceptable
- when remove-plus-add is the safer result

### 5. Heuristic fallback layer

`docs/diff-similarity-matching-boundary.md` defines bounded heuristic rescue.

This layer answers:

- when missing-ID similarity matching may be attempted
- when it must be forbidden
- how deterministic rules outrank heuristic rescue

Key rule:

- deterministic identity and classification always win before similarity rescue is considered

### 6. Extension surface layer

`docs/diff-ir-extension-points.md` defines reserved hooks for future richer comparison work.

This layer answers:

- where state, event, transition, and permission growth belongs
- which fields are minimal today versus reserved for later

Key rule:

- reserved hooks exist so later epics do not invent disconnected structures
- reserved hooks are not mandatory runtime payloads today

## End-To-End Reading Order

For new contributors, the recommended order is:

1. read `docs/diff-ir-vocabulary.md`
2. read `docs/diff-ir-extraction-contract.md`
3. read `docs/diff-ir-identity-policy.md`
4. read `docs/diff-reorder-move-policy.md`
5. read `docs/diff-rename-removeadd-policy.md`
6. read `docs/diff-similarity-matching-boundary.md`
7. read `docs/diff-ir-extension-points.md`

That order matches the intended decision flow from "what exists" through "how to compare it" to "where later richer semantics attach".

## Responsibility Boundaries

### Normalize

Normalization is responsible for canonicalizing equivalent authored forms before later diff interpretation. It does not define the comparison vocabulary or rewrite reviewer-facing continuity outcomes on its own.

Normalize should consume:

- extracted IR with source references
- authored ordering
- explicit versus absent value information

Normalize should not consume:

- reviewer summary decisions
- heuristic continuity overrides that belong to later matching policy

### Structural diff

Structural diff is responsible for:

- add / remove / update / reorder / move decisions
- applying deterministic identity and classification rules
- respecting heuristic boundaries when deterministic identity is missing

Structural diff should not:

- invent hidden normalization
- treat visible text as identity rescue
- invent extension-hook semantics that are not documented

### Semantic summary

Semantic summary is downstream from structural diff. It should build on:

- deterministic structural outcomes
- reserved extension hooks where available

Semantic summary should not:

- redefine identity
- override structural classification boundaries

### UI and workflow consumers

Reviewer UI, CLI, and PR integrations should consume the same IR and structural-diff outcomes rather than inventing separate comparison models.

## Working Rules For Developers

- Start from the source policy document that owns the question instead of patching this guide first.
- When adding new fields, decide whether they belong to minimal vocabulary, extraction metadata, deterministic classification, heuristic fallback, or reserved extension surface.
- Do not introduce a new top-level comparison concept when an existing owning unit plus extension hook can carry it.
- Prefer explicit rule documents over undocumented conventions in code.

## Downstream Connection Points

### Epic B

Epic B should use the extraction contract and vocabulary as the stable input boundary for normalization.

### Epic C

Epic C should implement structural diff on top of:

- deterministic identity
- reorder versus move boundary
- rename versus remove-plus-add boundary
- bounded similarity fallback

### Epic D

Epic D should derive semantic summaries from structural outcomes plus extension hooks, not from raw DSL text.

### Epic G

Epic G should expose the same comparison model in workflow tooling and PR surfaces.

### Epic H

Epic H may enrich heuristic signals, but it must stay inside the similarity boundary rules already fixed.

### Epic I

Epic I may use the extension hooks and deterministic continuity model for conflict and merge reasoning.

## Pending Integration

Pending from `T-20260328-128`:

- final representative acceptance scenario matrix
- explicit coverage links from each rule document to scenario categories

When `T-20260328-128` is closed, this guide should add a short section linking each major rule family to the accepted scenario set. Until then, scenario coverage is intentionally marked incomplete rather than guessed.

## Maintenance Notes

- Update this guide when a settled policy document changes or when a pending area becomes closed.
- Do not duplicate full rule text here when a shorter accurate map will do; this document is the entry point, not the law text.
- If a future ticket changes a boundary, update both the source policy and the relevant section in this guide.

## Change History

- 2026-03-28: Initial consolidated Diff IR spec and developer guide for Diff Engine Epic A / Sprint A3 / `T-20260328-129`.
