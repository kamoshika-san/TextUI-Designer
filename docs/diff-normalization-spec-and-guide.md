# Diff Normalization Spec And Verification Guide

Updated: 2026-03-28
Owner: Maintainer
Related ticket: `T-20260328-142`

## Purpose

This document is the consolidated entry point for Diff Engine Epic B normalization work.

It pulls together the settled decisions from:

- normalization scope and extraction boundary
- pipeline stage ownership
- rule-family boundaries for canonical order, defaults, pruning, alias, type, and nesting
- golden verification baselines
- AI-noise classification

This guide is not the source of truth for individual rules. It is the navigation layer that explains how the settled documents fit together and how downstream epics should consume them.

## Current Status

Settled inputs covered here:

- normalization scope boundary
- extraction-to-normalization responsibility split
- stage model
- canonical order rules
- default expansion and pruning rules
- alias / type / nesting rules
- representative golden normalization cases
- AI-noise taxonomy

Pending outside this guide:

- runtime implementation details of `normalize()`
- executable fixture layout and snapshot format in Epic J
- any later heuristic-noise tuning beyond deterministic normalization

## Canonical Sources

The current canonical source documents are:

- `docs/diff-normalization-scope-boundary.md`
- `docs/diff-extraction-normalization-boundary.md`
- `docs/diff-normalization-pipeline-stages.md`
- `docs/diff-canonical-order-rules.md`
- `docs/diff-default-expansion-pruning-rules.md`
- `docs/diff-alias-type-nesting-rules.md`
- `docs/diff-normalization-golden-cases.md`
- `docs/diff-ai-noise-taxonomy.md`

Use this guide to understand how they connect. Use the source documents when exact boundary language matters.

## Layered Model

### 1. Intake boundary

`docs/diff-extraction-normalization-boundary.md` defines the handoff from extraction into normalization.

Normalization assumes extraction already preserves:

- `sourceRef`
- authored order
- explicit-versus-absent evidence
- ownership structure

Key rule:

- extraction is a preservation layer, not a hidden canonicalization layer

### 2. Scope boundary

`docs/diff-normalization-scope-boundary.md` defines what normalization may rewrite and what it must leave for structural diff or semantic layers.

Normalization may:

- collapse representation-only drift
- apply documented equivalence rewrites with metadata preservation

Normalization must not:

- decide move / reorder / rename / remove-plus-add outcomes
- rescue continuity heuristically
- summarize semantic impact

### 3. Stage model

`docs/diff-normalization-pipeline-stages.md` defines the four-stage pipeline:

1. Stage 0: intake and preservation check
2. Stage 1: structural canonicalization
3. Stage 2: value equivalence canonicalization
4. Stage 3: handoff finalization

Key rule:

- each rule family attaches to one stage and must not drift across stages

### 4. Rule-family layer

Three documents define the settled rule families:

- `docs/diff-canonical-order-rules.md`
- `docs/diff-default-expansion-pruning-rules.md`
- `docs/diff-alias-type-nesting-rules.md`

Together they answer:

- which collections may be canonically ordered
- when deterministic defaults may be expanded or pruned
- when alias, type, and nesting drift are deterministic equivalence rather than preserved difference

### 5. Verification layer

`docs/diff-normalization-golden-cases.md` defines representative positive cases and negative controls.

This layer answers:

- what later golden fixtures must prove
- which evidence each accepted normalization must preserve
- which boundaries later verification must keep closed

### 6. AI-noise classification layer

`docs/diff-ai-noise-taxonomy.md` sorts AI-authored drift into:

- normalization-eligible noise buckets
- preserved-difference buckets

This layer answers:

- which AI-induced variations should converge under deterministic normalization
- which variations still belong to structural diff or reviewer interpretation

## End-To-End Reading Order

For new contributors, the recommended order is:

1. read `docs/diff-extraction-normalization-boundary.md`
2. read `docs/diff-normalization-scope-boundary.md`
3. read `docs/diff-normalization-pipeline-stages.md`
4. read `docs/diff-canonical-order-rules.md`
5. read `docs/diff-default-expansion-pruning-rules.md`
6. read `docs/diff-alias-type-nesting-rules.md`
7. read `docs/diff-normalization-golden-cases.md`
8. read `docs/diff-ai-noise-taxonomy.md`

That order matches the intended flow from handoff assumptions through canonicalization boundaries to verification and noisy-input classification.

## Responsibility Boundaries

### Normalize

Normalization is responsible for canonicalizing deterministic representation drift before structural diff.

Normalize should:

- consume extracted IR with preservation metadata intact
- reduce representational noise with documented rules
- preserve `sourceRef`, explicitness, authored order where required, and ownership evidence

Normalize must not:

- invent continuity decisions
- flatten ownership or ordering evidence needed later
- use heuristic or semantic rescue to make inputs "look equivalent"

### Structural diff

Structural diff is downstream from normalization and is still responsible for:

- add / remove / update / reorder / move classification
- continuity decisions
- handling preserved-difference cases that normalization intentionally leaves untouched

Structural diff should not:

- re-run hidden normalization
- assume child-order or ownership evidence has already been simplified away

### Verification

Verification should prove both:

- accepted deterministic convergence
- explicit non-convergence for forbidden cases

Verification should not:

- treat every AI variation as noise
- collapse structural-diff assertions into normalization baselines

## Rule Attachment Map

Use this map when deciding where new work belongs.

| Concern | Owning document | Stage |
| --- | --- | --- |
| extraction handoff payload | `diff-extraction-normalization-boundary.md` | pre-stage |
| preservation guardrails | `diff-normalization-scope-boundary.md` | Stage 0-3 constraint |
| canonical order | `diff-canonical-order-rules.md` | Stage 1 |
| shorthand / wrapper structural projection | `diff-alias-type-nesting-rules.md` | Stage 1 |
| default expansion / collapse | `diff-default-expansion-pruning-rules.md` | Stage 2 |
| redundant-field pruning | `diff-default-expansion-pruning-rules.md` | Stage 2 |
| alias / type equivalence | `diff-alias-type-nesting-rules.md` | Stage 2 |
| normalized handoff integrity | `diff-normalization-pipeline-stages.md` | Stage 3 |
| representative golden verification | `diff-normalization-golden-cases.md` | verification |
| AI-noise bucket classification | `diff-ai-noise-taxonomy.md` | verification / sample collection |

## Verification Guide

### What A Positive Baseline Should Assert

Use the golden cases when you want to prove normalization is allowed.

Each positive baseline should show:

1. authored forms differ before normalization
2. the difference is backed by deterministic equivalence
3. normalization converges to one canonical payload
4. preserved evidence remains recoverable

Typical positive families:

- canonical ordering of unordered property bags
- shorthand-to-canonical shape projection
- deterministic default convergence
- alias / type / nesting equivalence

### What A Negative Control Should Assert

Use negative controls when you want to prove the boundary stays closed.

Each negative control should show:

1. the authored forms differ in a way that looks temptingly similar
2. deterministic justification is missing or preservation evidence would be lost
3. normalization must not force convergence

Typical negative families:

- reviewer-visible child order
- context-sensitive defaults
- undocumented alias guesses
- ownership-flattening wrapper removal

### How To Classify AI Samples

Before adding an AI-authored sample to verification, ask:

1. Is the drift representational or structural?
2. Which deterministic rule family, if any, authorizes normalization?
3. Which evidence must still survive after normalization?
4. Does the sample belong in a normalizable bucket (`N1`-`N6`) or a preserved bucket (`P1`-`P5`)?

If you cannot answer those questions from the settled docs, the sample is not ready to be treated as normalization noise.

## Downstream Connection Points

### Epic C

Epic C should consume normalized output as the stable input to structural diff.

It depends on normalization not erasing:

- authored child order when sequence matters
- ownership / placement context
- explicit-versus-absent evidence when later interpretation needs it

### Epic H

Epic H may use the AI-noise taxonomy to collect or prioritize noisy samples, but it must stay inside deterministic normalization boundaries.

Epic H must not:

- turn undocumented similarity into a new normalization rule
- collapse preserved-difference buckets into noise-only buckets

### Epic J

Epic J should turn the golden cases and AI-noise taxonomy into executable baselines.

Epic J should build:

- positive fixtures for accepted deterministic convergence
- negative fixtures for forbidden convergence
- metadata assertions for `sourceRef`, explicitness, and ownership preservation

## Maintenance Notes

- Update this guide when a canonical normalization source document changes.
- Add new verification links here only after the underlying rule source is settled.
- Keep this document as the entry point, not the full law text.

## Change History

- 2026-03-28: Initial consolidated normalization spec and verification guide for Diff Engine Epic B / Sprint B3 / `T-20260328-142`.
