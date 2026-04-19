# SSoT Violation Playbook

Updated: 2026-03-27

## Goal

Provide one standard response path for when `npm run check:dsl-types-ssot` fails so the team can move from detection to fix, recheck, and handoff without improvising.

## Trigger

Use this playbook when `npm run check:dsl-types-ssot` exits nonzero or reports any `renderer/types` backflow outside the allowed renderer scope.

## Standard Response

1. Run `npm run check:dsl-types-ssot`.
2. Identify the violating file paths printed by the command.
3. For each violating file, replace shared DSL imports from `renderer/types` with `domain/dsl-types`.
4. If the violation is in non-renderer code, treat it as a direct regression and fix it in the same slice.
5. If the violation is in renderer-internal code, confirm whether it is truly renderer-local or whether it also belongs on `domain/dsl-types`.
6. Rerun `npm run check:dsl-types-ssot`.
7. Rerun the smallest relevant verification for the touched area, then write the handoff with the before/after result.

## Triage Questions

- Is the file outside `src/renderer/**`?
- Is the imported type actually shared across layers?
- Did the change also touch descriptor, schema, preview, or tests, requiring follow-up verification beyond the import fix?
- Is the doc snapshot still aligned with the current command output after the fix?

## Fix Rules

- Shared DSL types belong in `src/domain/dsl-types/`.
- Do not recreate `src/renderer/types.ts`.
- Do not suppress the violation with lint disables or review-only notes.
- If a failure reveals a wider scope issue than the current ticket, escalate to PM instead of silently broadening the slice.

## Role Split

### Developer

- Fix the violating imports.
- Rerun `npm run check:dsl-types-ssot`.
- Rerun focused verification for the touched lane.
- If an out-of-scope failure appears, report it to PM and note it in the review handoff.

### Reviewer

- Confirm the violating imports are actually removed.
- Confirm the post-fix `check:dsl-types-ssot` result is recorded in the handoff.
- Escalate to PM if the review shows scope drift, repeated violations across lanes, or follow-up ticketing needs.

### PM

- Split cross-lane failures into narrow follow-up tickets when a same-ticket fix would overrun scope.
- Use recurring failure patterns to decide whether release-gate or static-analysis work should be pulled forward.

## Minimum Verification

Always rerun:

- `npm run check:dsl-types-ssot`

Then choose the smallest fitting follow-up:

- `npm run compile`
- focused unit guard tests
- `npm test`

## Handoff Template

Record these points in the review handoff:

- failing command
- violating file paths
- applied fix direction (`renderer/types` -> `domain/dsl-types`)
- rerun result
- any out-of-scope failure escalated to PM

## Related

- [MAINTAINER_GUIDE.md](./MAINTAINER_GUIDE.md)
- [dsl-types-renderer-types-inventory.md](./dsl-types-renderer-types-inventory.md)
- [ssot-import-guard-matrix.md](./ssot-import-guard-matrix.md)
- [adr/0003-dsl-types-canonical-source.md](./adr/0003-dsl-types-canonical-source.md)
