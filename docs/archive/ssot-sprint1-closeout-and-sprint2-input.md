> Status: historical
> Updated: 2026-04-19
> Owner: Maintainer
> Reason: `docs/current/historical-notes` から読者主導線を切り離すため `docs/archive/` へ移設（T-20260419-022）
> Replacement: [現行ドキュメント索引](../current/README.md) 。リリース内容の要約はリポジトリルートの `CHANGELOG.md` を参照。

# SSoT Sprint 1 Closeout And Sprint 2 Input

Updated: 2026-03-27

## Role Of This Note

This is a historical sprint handoff note. It records what Sprint 1 established and what Sprint 2 was expected to inherit at that time.

## Historical Outcome

- Sprint 1 fixed the canonical-source baseline and the initial guard surface around `renderer/types`.
- Sprint 1 intentionally stopped short of renderer-internal mass migration and facade removal.
- Sprint 2 was expected to start from a classified backlog rather than re-open the source-of-truth decision.

## What Happened Later

- The guard and inventory docs were refreshed beyond the older Sprint 1 snapshot.
- Renderer shrinkage moved through entry, kernel, preview, and component follow-up slices.
- Current renderer planning has moved past the old Sprint 2 and Sprint 3 input assumptions captured here.

## How To Read This Note Now

- Treat the old Sprint 2 input pack as historical context, not as the active work queue.
- Treat the old Sprint 3 input as a record of earlier sequencing, not the current backlog source.
- Use the newer renderer closeout and facade docs for current-state planning.

## Current Source Of Truth

- Current renderer inventory: [ssot-renderer-types-inventory.md](ssot-renderer-types-inventory.md)
- Current facade assessment: [ssot-renderer-facade-sprint3-decision.md](ssot-renderer-facade-sprint3-decision.md)
- Current guard snapshot: [ssot-import-guard-matrix.md](ssot-import-guard-matrix.md)
- Current closeout state: [ssot-renderer-components-batching-memo.md](ssot-renderer-components-batching-memo.md)

## Preserved Historical Summary

- `src/domain/dsl-types/` was established as the canonical shared DSL type source.
- `src/renderer/types.ts` was established as a thin facade only.
- Non-renderer backflow detection was intentionally made mechanical before larger structural refactors.
- Renderer shrinkage was explicitly separated from the canonical-source baseline sprint.
