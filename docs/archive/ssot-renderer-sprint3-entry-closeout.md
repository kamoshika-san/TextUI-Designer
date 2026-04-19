> Status: historical
> Updated: 2026-04-19
> Owner: Maintainer
> Reason: `docs/current/historical-notes` から読者主導線を切り離すため `docs/archive/` へ移設（T-20260419-022）
> Replacement: [現行ドキュメント索引](../current/README.md) 。リリース内容の要約はリポジトリルートの `CHANGELOG.md` を参照。

# SSoT Renderer Sprint 3 Entry Closeout

Updated: 2026-03-27

## Scope At The Time

- T-301 renderer inventory refresh
- T-302 entry direct-import closeout

## Historical Outcome

- `src/renderer/webview.tsx` and `src/renderer/use-webview-messages.ts` had already moved to `../domain/dsl-types`.
- The entry-file migration was therefore complete.
- At that point, the remaining work was renderer-internal follow-up rather than more entry migration.

## What Happened Later

- The kernel slice landed.
- The preview follow-up landed.
- The component follow-up batches landed.
- The remaining open design question shifted from entry migration to facade handling and documentation hygiene.

## How To Use This Note Now

- Treat it as the closeout record for the entry phase only.
- Do not read the old "next slice" section as current planning.
- Current planning and assessment have moved to newer closeout and facade docs.

## Current Source Of Truth

- Current renderer inventory: [ssot-renderer-types-inventory.md](ssot-renderer-types-inventory.md)
- Current component closeout: [ssot-renderer-components-batching-memo.md](ssot-renderer-components-batching-memo.md)
- Current facade assessment: [ssot-renderer-facade-sprint3-decision.md](ssot-renderer-facade-sprint3-decision.md)

## Verification Anchor At The Time

- `npm run check:dsl-types-ssot`
- `tests/unit/renderer-types-thin-facade.test.js`
- `tests/unit/renderer-types-non-renderer-import-guard.test.js`
- `tests/unit/non-renderer-ssot-meta-guard.test.js`
- `tests/unit/ssot-eslint-restriction-scope.test.js`
