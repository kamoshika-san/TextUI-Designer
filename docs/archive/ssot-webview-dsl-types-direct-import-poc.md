> Status: historical
> Updated: 2026-04-19
> Owner: Maintainer
> Reason: `docs/current/historical-notes` から読者主導線を切り離すため `docs/archive/` へ移設（T-20260419-022）
> Replacement: [現行ドキュメント索引](../current/README.md) 。リリース内容の要約はリポジトリルートの `CHANGELOG.md` を参照。

# WebView Entry Direct `domain/dsl-types` PoC

Updated: 2026-03-27

## Role Of This Note

This is a historical PoC note for the entry-file case. It should not be read as the current renderer migration plan.

## What The PoC Proved

- WebView entry files could import shared DSL contracts directly from `src/domain/dsl-types`.
- `src/renderer/types.ts` was already thin enough that removing one compatibility hop did not change type meaning.
- The renderer layer was never structurally blocked from importing the canonical domain types directly.

## What Happened After The PoC

- The entry-file direct imports remained in place.
- The kernel, preview, and component follow-up slices also landed.
- The repo has moved beyond the original PoC question of whether direct import is viable.

## What This PoC Does Not Mean

- It does not justify deleting `src/renderer/types.ts` by itself.
- It does not stand in for the later facade assessment.
- It does not describe the current backlog; it describes the first successful proof point.

## Historical Readout

At the time of the PoC, the next intended candidates were `component-map.tsx`, `registered-component-kernel.tsx`, and `preview-diff.ts`, while `preview-built-in-renderers.tsx` and `components/*` were intentionally deferred.

That readout is now historical only, because those later slices have already landed.

## Current Source Of Truth

- Current renderer inventory: [ssot-renderer-types-inventory.md](ssot-renderer-types-inventory.md)
- Current facade assessment: [ssot-renderer-facade-sprint3-decision.md](ssot-renderer-facade-sprint3-decision.md)

## Verification Used At The Time

- `npm run lint`
- `npm test`

The important outcome remains architectural: the canonical `domain/dsl-types` import path works from the renderer entry boundary.
