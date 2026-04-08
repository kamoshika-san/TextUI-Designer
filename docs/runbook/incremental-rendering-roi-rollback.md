# Incremental Rendering ROI and Rollback Runbook

Updated: 2026-04-09
Owner: Maintainer
Related tickets: `T-20260403-725`, `T-20260403-726`

## Purpose

This runbook gives PdM, PM, and operators one compact way to answer two
questions:

1. is incremental rendering delivering meaningful latency improvement
2. if not, how do we back out safely and quickly

It assumes the current guarded route in `ExportManager`:

- incremental diff is preferred only when the gate is on and preflight succeeds
- unsafe or invalid incremental execution downgrades to full render automatically
- route quality is observed through `getPerformanceStats().incrementalRouteMetrics`

## ROI reading guide

Treat ROI as a comparison between the diff route and full render on
representative edits, not as a blanket claim about all exports.

Use this minimum scorecard:

| Question | Signal | Interpretation |
|---|---|---|
| Is the route actually being exercised? | `diffRoute.totalSamples` and `fullRender.directCount` | low diff sample count means ROI claims are premature |
| Is latency improving in normal use? | `diffRoute.medianMs` and `diffRoute.p95Ms` versus `fullRender.medianMs` and `fullRender.p95Ms` | the route is only valuable if representative edits are faster, especially at `p95` |
| Is the route stable enough to trust? | `diffRoute.failureRate` | failures point to correctness risk, not just conservative downgrade |
| Is the route delivering practical exposure? | `diffRoute.fallbackRate` and `fullRender.fallbackCount` | high fallback means the route may be safe but not materially useful |
| Why is the route downgrading? | `fallbackReasons` | grouped reasons tell us whether the problem is readiness, coverage, or runtime correctness |

## Minimum ROI claim for promotion

Before claiming the route is worth wider rollout, confirm all of the following:

- representative large-document edits show a meaningful `p95` win for the diff route
- `failureRate` remains effectively zero on the accepted evaluation slice
- `fallbackRate` is low enough that the route is genuinely active rather than mostly bypassed
- fallback reasons are dominated by known conservative cases, not unexplained execution mismatches

If any of those points is missing, the route may still be safe, but the ROI
case is not ready.

## Suggested review cadence

Use this cadence while Sprint 3 rollout work is still active:

| Stage | Review cadence | Decision owner |
|---|---|---|
| `local-only` | after focused implementation or benchmark changes | developer + reviewer |
| `canary` | at least once per validation window | maintainer + PM |
| `default-on` | whenever route metrics drift or a downgrade cluster appears | maintainer + PM + PdM when ROI is unclear |

## Rollback triggers

Rollback should be considered immediately when one of these is true:

- `diffRoute.failureRate` rises above the accepted baseline for the validation slice
- `fallbackReasons` start clustering around execution errors or invalid results
- `diffRoute.p95Ms` loses its material advantage over full render on representative large-document edits
- operators can no longer explain whether the route is helping because most traffic is silently downgrading

## Rollback procedure

Rollback is exposure-first.

1. disable `enableIncrementalDiffRoute` for the affected workflow or validation lane
2. confirm new route samples return to direct full render behavior
3. capture the current `incrementalRouteMetrics` snapshot and dominant `fallbackReasons`
4. open a PM escalation with:
   - stage at the time of rollback
   - observed latency drift or failure signal
   - dominant fallback reason
   - representative document or scenario
5. keep the route disabled until the failure class is understood and fixed

## What to record in the PM escalation

Keep the escalation compact and specific:

- rollout stage: `local-only`, `canary`, or `default-on`
- observation window: when the drift or failure was seen
- route metrics:
  - `diffRoute.totalSamples`
  - `diffRoute.medianMs`
  - `diffRoute.p95Ms`
  - `diffRoute.fallbackRate`
  - `diffRoute.failureRate`
  - `fullRender.medianMs`
  - `fullRender.p95Ms`
- top fallback reasons
- whether the rollback was precautionary or triggered by a confirmed regression

## Operator note

Automatic downgrade is a safety mechanism, not proof of success.

If the route stays "green" only because it keeps falling back, the correct
decision is usually to hold or roll back exposure until the team understands
why the guarded path is not delivering real diff-route wins.
