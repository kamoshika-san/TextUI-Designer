# SSoT Sprint 1 Closeout And Sprint 2 Input

Updated: 2026-03-24

## Sprint 1 Goal

Fix the canonical DSL type boundary observation so later normalization work cannot silently drift back to `renderer/types`.

## Sprint 1 Outcome

- `src/domain/dsl-types/` is documented as the canonical shared DSL type source.
- `src/renderer/types.ts` is documented and guarded as a thin facade only.
- Non-renderer backflow to `renderer/types` is checked by script, unit tests, and ESLint scope restrictions.
- Renderer migration candidates are classified so the next migration sprint starts from a known list instead of a fresh inventory pass.

## Done Against Sprint 1

| Ticket | Outcome | Artifact |
|---|---|---|
| T-360 | Fixed Sprint 1 boundary baseline and shared terms | `docs/ssot-sprint1-boundary-baseline.md` |
| T-361 | Refreshed import inventory snapshot to the 2026-03-24 repo state | `docs/dsl-types-renderer-types-inventory.md` |
| T-362 | Mapped each guard to the exact boundary it protects | `docs/ssot-import-guard-matrix.md` |
| T-363 | Fixed implementer entry rules for shared DSL type additions | `docs/ssot-dsl-type-addition-rules.md` |
| T-364 | Classified renderer migration candidates for the later shrinkage sprint | `docs/ssot-renderer-sprint3-candidates.md` |

## Must-Have Sprint 1 Exit Criteria

| Exit criterion | Status | Evidence |
|---|---|---|
| `domain/dsl-types` is treated as the only shared DSL type addition path | met | baseline doc, addition rules, thin-facade guard |
| `renderer/types` is explicitly treated as a thin facade | met | baseline doc, inventory, `renderer-types-thin-facade.test.js` |
| Non-renderer backflow can be detected mechanically | met | `npm run check:dsl-types-ssot`, unit guards, ESLint restriction scope |
| Sprint 2 can start from a classified migration backlog | met | inventory snapshot, Sprint 3 candidate list, guard matrix gaps |

## Not Done In Sprint 1

- `src/renderer/types.ts` was not removed.
- Broad shared type splitting was not started.
- Renderer-internal imports were not mass-migrated to `domain/dsl-types`.
- Preview-only type extraction was not forced ahead of evidence.

These items stay out of Sprint 1 on purpose. The sprint fixed the decision baseline and the observation surface first.

## Sprint 2 Input Pack

### Normalization backlog

1. Keep new shared DSL type additions on `src/domain/dsl-types/` only and reject any new non-renderer `renderer/types` usage.
2. Revisit large mixed ownership areas in the canonical DSL type files and split only where the canonical boundary stays clear.
3. Keep descriptor, built-in component, and guard updates synchronized with DSL union changes.

### Candidate work items

- Split broad canonical type families only after choosing file boundaries that still preserve `domain/dsl-types` as the single entry path.
- Convert any remaining wording that still implies `renderer/types` is a normal import surface.
- Extend guard or inventory coverage only if Sprint 2 refactors move directories or add new canonical type groups.

### Risks and assumptions

- Guard coverage must stay aligned with repo directory moves; otherwise the script snapshot and test scope can drift apart.
- Renderer-internal usage still exists by design, so Sprint 2 should not confuse canonical-source normalization with renderer shrinkage work.
- Any new built-in component work must keep descriptor and DSL contract updates in lockstep or the canonical source claim becomes documentation-only.

## Sprint 3 Input

- Start with the direct-import candidates already called out in `docs/ssot-renderer-sprint3-candidates.md`.
- Treat component-level renderer cleanup as a later wave unless a small PoC shows low churn.
- Do not make facade deletion the entry criterion for Sprint 3; make reduced dependency surface the criterion.

## Decision Log

- Sprint 1 succeeded as a boundary-observation sprint, not as a facade-removal sprint.
- The mechanical guard baseline is strong enough to start Sprint 2 normalization without reopening the canonical-source question.
- Renderer shrinkage remains a separate execution track and should use the Sprint 1 inventory instead of restarting discovery.

## Use With

- [ssot-sprint1-boundary-baseline.md](ssot-sprint1-boundary-baseline.md)
- [dsl-types-renderer-types-inventory.md](dsl-types-renderer-types-inventory.md)
- [ssot-import-guard-matrix.md](ssot-import-guard-matrix.md)
- [ssot-dsl-type-addition-rules.md](ssot-dsl-type-addition-rules.md)
- [ssot-renderer-sprint3-candidates.md](ssot-renderer-sprint3-candidates.md)
