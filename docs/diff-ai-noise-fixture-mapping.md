# Diff AI Noise Fixture Mapping

Updated: 2026-03-28
Owner: Maintainer
Related ticket: `T-20260328-200`

## Purpose

This document defines how the AI-noise taxonomy maps into executable fixture records for later Epic J and Epic H work.

It complements:

- `docs/diff-ai-noise-taxonomy.md` for bucket semantics
- `docs/diff-normalization-fixture-shape.md` for the base fixture manifest

This page does not define runner behavior or heuristic tuning. It only fixes the record shape used to attach representative AI-generated samples to the taxonomy buckets.

## Design Goals

The mapping must let later teams record:

1. which taxonomy bucket a sample belongs to
2. whether that sample is normalizable or preserved
3. which normalization rule family justifies the decision
4. which evidence must still survive after normalization
5. which future Epic H sample-collection work can reuse the same record

## Mapping Unit

One mapping record represents one representative AI-authored sample pattern.

Recommended top-level shape:

```yaml
sampleId: N1-001
kind: ai-noise-sample
bucketRef:
  taxonomyBucket: N1
  classification: normalizable
  sourceDoc: docs/diff-ai-noise-taxonomy.md
summary: Documented alias key drift for one canonical DSL field
ruleBinding:
  epicBRuleFamily: alias-collapse
  relatedDocs:
    - docs/diff-alias-type-nesting-rules.md
fixtureBinding:
  fixtureKind: normalization-golden
  fixtureMode: equivalent
  recommendedCaseRef: G-005
sampleShape:
  authoredInputCount: 2
  samplePaths:
    - fixtures/noise/N1-001/authored-a.tui.yml
    - fixtures/noise/N1-001/authored-b.tui.yml
expectation:
  normalize: true
  canonicalSnapshotPath: fixtures/noise/N1-001/normalized.snapshot.yml
preservedEvidence:
  sourceRef: preserve
  explicitness: preserve
  ownership: preserve
guardrails:
  mustNotCross:
    - undocumented-alias
notes:
  - Reusable by later Epic H sample collection
```

## Required Fields

### 1. Sample Metadata

Required fields:

- `sampleId`
- `kind`
- `bucketRef.taxonomyBucket`
- `bucketRef.classification`
- `summary`

Rules:

- `sampleId` should use the bucket id as a prefix, for example `N3-002` or `P4-001`
- `kind` is fixed to `ai-noise-sample`
- `bucketRef.classification` must be either:
  - `normalizable`
  - `preserved`

### 2. Rule Binding

Required fields:

- `ruleBinding.epicBRuleFamily`

Optional fields:

- `ruleBinding.relatedDocs`
- `ruleBinding.notes`

This block explains why the bucket outcome is deterministic rather than heuristic.

Example rule families:

- `alias-collapse`
- `primitive-type-normalization`
- `shorthand-expansion`
- `default-expansion`
- `redundant-field-pruning`
- `ownership-preservation`

### 3. Fixture Binding

Required fields:

- `fixtureBinding.fixtureKind`
- `fixtureBinding.fixtureMode`

Optional fields:

- `fixtureBinding.recommendedCaseRef`

Rules:

- `fixtureKind` is usually `normalization-golden`
- `fixtureMode` must be one of:
  - `equivalent`
  - `non-equivalent`
  - `sample-only`

Interpretation:

- `equivalent` means the sample should collapse into one canonical normalized snapshot
- `non-equivalent` means the sample should remain visible as preserved difference
- `sample-only` is allowed for exploratory buckets collected before a golden case is assigned

### 4. Sample Shape

Required fields:

- `sampleShape.authoredInputCount`
- `sampleShape.samplePaths`

Optional fields:

- `sampleShape.labels`
- `sampleShape.layoutNotes`

Rules:

- `authoredInputCount` must match the number of paths
- keep the sample narrow and bucket-specific
- prefer one sample pattern per record rather than bundling multiple bucket candidates

### 5. Expectation

Required fields:

- `expectation.normalize`

For normalizable buckets (`N1-N6`), also require:

- `expectation.canonicalSnapshotPath`

For preserved buckets (`P1-P5`), also require:

- `expectation.preservationReason`

Example preserved case:

```yaml
expectation:
  normalize: false
  preservationReason: reviewer-visible-order-must-survive
```

### 6. Preserved Evidence

Every record must explicitly name which evidence survives.

Required keys:

- `sourceRef`
- `explicitness`
- `ownership`

Allowed values:

- `preserve`
- `not-applicable`
- `forbidden`

This keeps the AI-noise sample records aligned with the fixture-shape baseline.

## Bucket-To-Mode Mapping

Use this fixed translation:

| Bucket | Classification | Fixture mode | Typical expectation |
| --- | --- | --- | --- |
| `N1` | normalizable | `equivalent` | canonical alias collapse |
| `N2` | normalizable | `equivalent` | canonical primitive typing |
| `N3` | normalizable | `equivalent` | canonical shorthand projection |
| `N4` | normalizable | `equivalent` | wrapper-free canonical shape |
| `N5` | normalizable | `equivalent` | explicit default collapses with explicitness preserved |
| `N6` | normalizable | `equivalent` | redundant duplicate pruned with origin preserved |
| `P1` | preserved | `non-equivalent` | structure must remain different |
| `P2` | preserved | `non-equivalent` | undocumented alias must remain visible |
| `P3` | preserved | `non-equivalent` | context-sensitive default must not collapse |
| `P4` | preserved | `non-equivalent` | free-text paraphrase must remain visible |
| `P5` | preserved | `non-equivalent` | ownership-flattening change must remain visible |

## Recommended Directory Layout

```text
fixtures/
  noise/
    N1-001/
      sample.yml
      authored-a.tui.yml
      authored-b.tui.yml
      normalized.snapshot.yml
    P1-001/
      sample.yml
      authored-a.tui.yml
      authored-b.tui.yml
```

Rules:

- the manifest file is always `sample.yml`
- `normalized.snapshot.yml` exists only when `expectation.normalize: true`
- preserved buckets should not include a canonical normalized snapshot unless later tooling needs a rejected-normalization trace for debugging

## Bucket Guidance

### `N1` to `N6`

For normalizable buckets:

- bind each sample to one deterministic Epic B rule family
- record one canonical snapshot path
- keep `preservedEvidence` explicit, especially `explicitness` for `N5` and `N6`

### `P1` to `P5`

For preserved buckets:

- make `expectation.normalize: false`
- state one concrete preservation reason
- use `guardrails.mustNotCross` to name the forbidden collapse

Examples:

- `P1` -> `reviewer-visible-child-order`
- `P3` -> `context-sensitive-default`
- `P5` -> `ownership-wrapper`

## Interaction With Future Epic H

Later Epic H collection work should reuse this same record shape.

That means:

- no separate exploratory schema for AI-noise samples
- same `sampleId` can move from J1 cataloging into H1/H2 analysis
- future scoring or confidence fields must be added by Epic H rather than guessed here

## Acceptance Criteria

This mapping is complete enough when:

- every `N1-N6` and `P1-P5` bucket can be encoded without adding new top-level fields
- normalizable and preserved samples can share one record family
- the record shape points back to both taxonomy semantics and fixture expectations
- later teams can collect representative samples without redesigning the metadata axes

## Change History

- 2026-03-28: Initial AI-noise fixture mapping baseline for Diff Engine Epic J / Sprint J1 / `T-20260328-200`.
