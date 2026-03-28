# Diff Normalization Fixture Shape

Updated: 2026-03-28
Owner: Maintainer
Related ticket: `T-20260328-199`

## Purpose

This document defines the minimum executable fixture shape for normalization golden cases.

It exists to bridge:

- the rule-oriented baseline in `docs/diff-normalization-golden-cases.md`
- the AI-noise bucket design in `docs/diff-ai-noise-taxonomy.md`
- later Epic J snapshot and harness implementation

This page does not define the test runner. It only fixes the fixture vocabulary and record boundaries so later automation does not need to re-decide the fixture schema.

## Design Goals

The fixture shape must let later tests express:

1. authored input variants before normalization
2. one canonical normalized expectation
3. metadata assertions for preserved evidence
4. negative controls that must not collapse
5. traceable linkage back to the golden case matrix

The shape must stay small enough that one fixture proves one rule family plus the minimum required preservation evidence.

## Fixture Unit

One fixture file represents one case id, for example `G-001` or `NG-002`.

Each fixture file must contain:

- fixture metadata
- one or more authored inputs
- one canonical expectation or explicit non-equivalence expectation
- metadata assertions
- scope guardrails

Recommended top-level shape:

```yaml
fixtureId: G-001
kind: normalization-golden
caseRef:
  goldenCaseId: G-001
  ruleFamily: canonical-order
  stage: stage-1
  sourceDoc: docs/diff-normalization-golden-cases.md
summary: Same unordered property bag written in different key orders
assertionMode: equivalent
inputs:
  - id: authored-a
    role: primary
    dslPath: fixtures/golden/G-001/authored-a.tui.yml
  - id: authored-b
    role: variant
    dslPath: fixtures/golden/G-001/authored-b.tui.yml
expectation:
  normalizedSnapshotPath: fixtures/golden/G-001/normalized.snapshot.yml
  metadataAssertionRef: meta-g-001
metadataAssertions:
  - id: meta-g-001
    sourceRef: preserve
    explicitness: preserve
    ownership: preserve
    canonicalizationMarkers:
      required:
        - canonical-order
      forbidden:
        - semantic-inference
guardrails:
  mustNotNormalize:
    - reviewer-visible-child-order
notes:
  - Positive equivalence case for canonical-order rules
```

## Required Fields

### 1. Fixture Metadata

Required fields:

- `fixtureId`
- `kind`
- `caseRef.goldenCaseId`
- `caseRef.ruleFamily`
- `caseRef.stage`
- `summary`
- `assertionMode`

Rules:

- `fixtureId` must match the ticketed case id, for example `G-008` or `NG-003`
- `kind` is fixed to `normalization-golden`
- `assertionMode` must be one of:
  - `equivalent`
  - `non-equivalent`
  - `single-input`

Interpretation:

- `equivalent` means multiple authored inputs are expected to normalize to one canonical snapshot
- `non-equivalent` means the fixture exists as a negative control and must not collapse
- `single-input` is allowed when one case only needs one authored input plus metadata assertions

### 2. Inputs

Each entry in `inputs` must contain:

- `id`
- `role`
- `dslPath`

Optional fields:

- `label`
- `notes`

Rules:

- `role` should be `primary`, `variant`, or `negative-control`
- every `dslPath` must point to one authored DSL file, not to normalized output
- authored inputs must remain narrow and rule-specific

### 3. Expectation

For `assertionMode: equivalent`, `expectation` must contain:

- `normalizedSnapshotPath`
- `metadataAssertionRef`

Optional fields:

- `canonicalNotes`

For `assertionMode: non-equivalent`, `expectation` must contain:

- `mustDifferFrom`
- `differenceReason`

Example:

```yaml
expectation:
  mustDifferFrom:
    - authored-a
    - authored-b
  differenceReason: reviewer-visible-order-must-survive
```

### 4. Metadata Assertions

Each entry in `metadataAssertions` must name the preserved evidence explicitly.

Minimum assertion keys:

- `sourceRef`
- `explicitness`
- `ownership`

Allowed values for those keys:

- `preserve`
- `not-applicable`
- `forbidden`

Use `canonicalizationMarkers` when the fixture needs to name which rule family was allowed to act.

### 5. Guardrails

Every fixture must declare at least one `mustNotNormalize` guardrail.

Examples:

- `reviewer-visible-child-order`
- `ownership-wrapper`
- `undocumented-alias`
- `context-sensitive-default`
- `free-text-semantic-rephrasing`

This field exists to stop later runner work from broadening fixture semantics silently.

## File Layout

Recommended directory layout:

```text
fixtures/
  golden/
    G-001/
      fixture.yml
      authored-a.tui.yml
      authored-b.tui.yml
      normalized.snapshot.yml
```

For negative controls:

```text
fixtures/
  golden/
    NG-001/
      fixture.yml
      authored-a.tui.yml
      authored-b.tui.yml
```

Rules:

- the fixture manifest is always `fixture.yml`
- authored inputs stay adjacent to the manifest
- normalized snapshots exist only for `equivalent` fixtures
- negative controls should not include a canonical normalized snapshot unless later tooling explicitly needs a rejected-normalization trace

## Mapping To Golden Cases

Use this direct translation rule:

- `Case ID` -> `fixtureId`
- `Stage` -> `caseRef.stage`
- `Rule Family` -> `caseRef.ruleFamily`
- `Authored variation to compare` -> `inputs[]`
- `Canonical expectation` -> `expectation.normalizedSnapshotPath` or `differenceReason`
- `Evidence to preserve` -> `metadataAssertions[]`
- `Must not cross` -> `guardrails.mustNotNormalize[]`

This mapping is mandatory so Epic J can remain a mechanical encoding step rather than a second design pass.

## Positive Fixture Shape Guidance

Positive equivalence fixtures should:

- include at least two authored inputs when equivalence is the point
- point to exactly one canonical normalized snapshot
- name the rule family in `canonicalizationMarkers.required`
- keep one preservation assertion block per case

Example cases:

- `G-001` canonical-order
- `G-003` shorthand expansion
- `G-008` omitted versus explicit default

## Negative Control Shape Guidance

Negative controls should:

- still use the same top-level fixture vocabulary
- switch `assertionMode` to `non-equivalent`
- omit `normalizedSnapshotPath`
- state the forbidden collapse reason explicitly

Example cases:

- `NG-001` ordered child sequence
- `NG-002` context-sensitive default
- `NG-003` undocumented alias guess
- `NG-004` ownership wrapper flattening

## Metadata Assertion Semantics

### `sourceRef`

Use `preserve` when later normalization output must still let the runner verify where the canonical record came from in authored input.

### `explicitness`

Use `preserve` when omission-versus-explicit origin is part of the rule boundary, especially around defaults and pruning.

### `ownership`

Use `preserve` whenever later diff work depends on parent or slot continuity remaining visible after normalization.

### `canonicalizationMarkers`

Use this block to say which rule families are expected to appear in the normalized trace.

Example:

```yaml
canonicalizationMarkers:
  required:
    - default-expansion
    - redundant-field-pruning
  forbidden:
    - ownership-flattening
    - similarity-rescue
```

## Non-Goals

This fixture shape must not encode:

- structural diff event classification
- semantic summary wording
- heuristic rescue scoring
- runner CLI behavior
- snapshot update workflow

Those belong to later Epics C, D, H, and J2/J3.

## Acceptance Criteria

This fixture shape is complete enough when:

- every `G-001` to `G-012` case can map into the schema without adding new top-level fields
- every `NG-*` case can express non-equivalence without inventing a second manifest type
- metadata assertions can name `sourceRef`, explicitness, and ownership preservation directly
- later teams can implement fixture files mechanically from the existing case matrix

## Change History

- 2026-03-28: Initial fixture-shape baseline for Diff Engine Epic J / Sprint J1 / `T-20260328-199`.
