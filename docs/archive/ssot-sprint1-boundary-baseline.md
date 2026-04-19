> Status: historical
> Updated: 2026-04-19
> Owner: Maintainer
> Reason: `docs/current/historical-notes` から読者主導線を切り離すため `docs/archive/` へ移設（T-20260419-022）
> Replacement: [現行ドキュメント索引](../current/README.md) 。リリース内容の要約はリポジトリルートの `CHANGELOG.md` を参照。

# SSoT Sprint 1 Boundary Baseline

Updated: 2026-03-27

## Role Of This Note

This is a historical baseline note for the earliest boundary-definition sprint.

## Historical Baseline

- Canonical shared DSL types live in `src/domain/dsl-types/`.
- `src/renderer/types.ts` remains a thin facade only.
- New non-renderer imports must use `domain/dsl-types`, not `renderer/types`.
- Sprint 1 fixed observation, terminology, and guard coverage before any larger structural rewrite.

## What Changed Later

- The repo moved beyond baseline observation into renderer shrinkage execution.
- Renderer entry, kernel, preview, and component follow-up slices have already landed.
- Current planning no longer depends on this baseline note for active ticket slicing.

## How To Use This Note Now

- Treat it as the original boundary-definition record.
- Use it for terminology and intent, not as the current migration plan.
- For current state, read the newer inventory, guard, closeout, and facade assessment docs instead.

## Current Source Of Truth

- Current renderer inventory: [ssot-renderer-types-inventory.md](ssot-renderer-types-inventory.md)
- Current guard snapshot: [ssot-import-guard-matrix.md](ssot-import-guard-matrix.md)
- Current facade assessment: [ssot-renderer-facade-sprint3-decision.md](ssot-renderer-facade-sprint3-decision.md)

## Preserved Terms

- Canonical source: the single place where shared DSL type definitions are authored. In this repo that is `src/domain/dsl-types/`.
- Thin facade: a compatibility module that only re-exports canonical definitions and does not define new shared types or logic. In this repo that is `src/renderer/types.ts`.
- Backflow: a non-renderer module importing `renderer/types` instead of `domain/dsl-types`.
- Direct-import migration candidate: a file or layer that used the facade at the time and could later move to `domain/dsl-types` without changing product behavior.
