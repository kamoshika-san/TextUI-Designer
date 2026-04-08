# Incremental Rendering Rollout Stage Plan

Updated: 2026-04-09
Owner: Maintainer
Related tickets: `T-20260403-725`, `T-20260403-726`

## Purpose

This document defines how the guarded incremental rendering route should move
from implementation-only use to wider default usage.

It fixes:

1. the rollout stages
2. the promotion criteria between stages
3. the rollback triggers for each stage
4. the signals operators should observe before widening exposure

It does not define:

- a new flag API surface
- permanent release policy outside incremental rendering
- long-term telemetry storage

## Current control surface

The current runtime control remains the existing `enableIncrementalDiffRoute`
option on `ExportOptions`.

That gate already supports three operational states:

- `false` or omitted: full render only
- `true` with no prior snapshot or unresolved preflight: guarded full render
- `true` with a valid previous snapshot and resolved targets: incremental diff

The route must continue to prefer safety over exposure:

- preflight failures downgrade to full render
- execution errors downgrade to full render
- invalid incremental payloads downgrade to full render

## Route signals to observe

Rollout decisions should use both:

- `getPerformanceStats().incrementalRouteMetrics`
- semantic compare confidence from `textui compare` / `SemanticDiff.confidence`

The minimum signals are:

| Signal | Meaning | Use |
|---|---|---|
| `diffRoute.totalSamples` | number of attempted incremental diff route samples | check whether the stage has enough evidence |
| `diffRoute.medianMs` / `p95Ms` | incremental route latency distribution | compare against full render behavior |
| `diffRoute.fallbackRate` | ratio of attempted diff samples that downgraded | decide whether the route is stable enough to widen |
| `diffRoute.failureRate` | ratio of attempted diff samples that failed during execution or returned invalid payloads | detect route correctness problems, not just conservative preflight bypass |
| `diffRoute.preflightBypassCount` | count of preflight downgrades before diff execution | distinguish input/readiness limits from runtime failures |
| `fullRender.directCount` / `fallbackCount` | direct full-render samples vs fallback full renders | confirm whether widening exposure is actually shifting traffic |
| `fallbackReasons` | grouped downgrade reasons | identify dominant rollback cause quickly |

## Semantic diff confidence signals

When rollout decisions depend on whether a diff result is trustworthy enough to
widen exposure, use the semantic diff confidence summary as the reviewer-facing
signal:

| Signal | Meaning | Use |
|---|---|---|
| `diff.confidence.band` | overall confidence band (`high` / `medium` / `low`) | decide whether the current result supports promotion, canary-only use, or hold |
| `diff.confidence.recommendedAction` | rollout-oriented recommendation (`promote` / `canary` / `hold`) | keep rollout language consistent with implementation output |
| `diff.confidence.ambiguousChanges` | count of ambiguity-marked changes | detect whether the route still depends on fallback-heavy matching |
| `diff.confidence.lowConfidenceChanges` | count of reject-tier changes | distinguish one weak edge from a generally trustworthy diff |

The confidence summary is not a replacement for runtime route metrics. It is
the companion signal that answers "should we trust what this diff says?" while
the incremental route metrics answer "did the route behave well enough to keep
exposing it?".

## Stage overview

| Stage | Audience | Gate posture | Primary goal |
|---|---|---|---|
| `local-only` | implementers | opt-in only | prove the guarded route behaves correctly on representative edits |
| `canary` | maintainers and selected operators | opt-in for a narrow validation slice | confirm measurable improvement without unacceptable downgrade rates |
| `default-on` | normal operators and product stakeholders | enabled by default for supported paths | treat incremental rendering as the preferred route while preserving rollback |

The route must not skip directly from implementation work to `default-on`.

## Stage 1: `local-only`

### Intent

`local-only` is the developer validation stage.

The feature may be enabled on representative documents and test lanes, but it
must not yet be treated as a generally recommended default.

### Expected signals

- focused route tests are green
- benchmark scenarios complete without unexpected downgrade
- `fallbackReasons` are explainable when they appear
- `failureRate` is effectively zero on the maintained benchmark slice
- semantic compare results on representative edits produce `diff.confidence.recommendedAction !== "hold"`

### Promotion criteria to `canary`

Promote only when all of the following are true:

- `diffRoute.totalSamples` includes representative nested and sibling-heavy cases
- `diffRoute.failureRate` is `0` on the accepted benchmark slice
- downgrade cases are either expected preflight bypasses or clearly understood bugs
- `diffRoute.medianMs` is not materially worse than `fullRender.medianMs` on representative edits
- semantic compare on representative edits is mostly `high` confidence, with no unexplained ambiguity clusters

### Rollback triggers inside `local-only`

Stay in `local-only` or narrow exposure if:

- execution failures appear in normal validation scenarios
- fallback reasons are noisy or unexplained
- the route only appears fast because it is rarely actually attempted

## Stage 2: `canary`

### Intent

`canary` is the first operational stage.

The feature remains explicitly enabled, but only for a narrow operator-owned
slice where maintainers can watch route quality closely.

### Exposure rule

Canary enablement should be limited to:

- representative large DSL documents
- one maintained validation lane or internal workflow
- operators who can compare before/after behavior quickly

### Promotion criteria to `default-on`

Promote only when all of the following are true:

- `diffRoute.totalSamples` is large enough to represent normal edited flows, not just synthetic micro-cases
- `diffRoute.fallbackRate` stays low enough that the feature is still providing meaningful exposure
- `diffRoute.failureRate` stays at or near zero over the canary window
- `diffRoute.p95Ms` is meaningfully better than `fullRender.p95Ms` on representative large-document edits
- dominant `fallbackReasons` are understood and acceptable as conservative safety behavior
- rollback remains a simple gate disablement, not a code hotfix dependency
- semantic compare confidence is consistently `high` or `medium` with `recommendedAction !== "hold"` on the maintained canary slice

### Rollback triggers inside `canary`

Roll back to `local-only` if any of the following occurs:

- execution failures recur in the canary slice
- `fallbackRate` climbs enough that the route stops delivering practical benefit
- `p95` improvement disappears on representative large-document edits
- fallback reasons shift from conservative preflight causes to runtime correctness causes
- semantic compare starts returning repeated `hold` recommendations on representative canary edits

## Stage 3: `default-on`

### Intent

`default-on` is the first stage where incremental rendering is treated as the
normal preferred route for supported edit paths.

Full render remains the required safety path, not a removed legacy path.

### Operating rule

Even in `default-on`:

- direct full render remains valid for unsupported paths
- automatic downgrade remains enabled
- widening exposure must never remove the operator's ability to disable the route quickly

### Ongoing health signals

Operators should keep watching:

- `diffRoute.failureRate` for correctness regressions
- `diffRoute.fallbackRate` for erosion of practical exposure
- `fallbackReasons` for newly dominant downgrade causes
- `diffRoute.p95Ms` versus `fullRender.p95Ms` for ROI drift
- semantic compare confidence for representative edits, especially whether ambiguous or reject-tier changes are becoming common

### Rollback triggers from `default-on`

Roll back to `canary` or `local-only` if:

- execution failures become non-trivial
- fallback reasons indicate a new runtime mismatch class
- observed latency improvement is no longer material on representative large DSL edits
- maintainers cannot explain whether the route is helping or merely falling back silently
- semantic compare confidence repeatedly drops to `hold` for edits the route is expected to handle confidently

## Promotion checklist

Before promoting to the next stage, confirm:

1. route samples exist in meaningful volume
2. failures and fallbacks are separated, not collapsed into one number
3. latency comparison is based on representative edits, not only synthetic no-op runs
4. rollback is still a simple exposure change using the existing gate
5. semantic compare confidence on representative edits does not recommend `hold`

If any answer is unclear, promotion should stop there.
