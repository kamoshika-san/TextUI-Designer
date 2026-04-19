# Documentation Doc Debt Runbook

Updated: 2026-03-28
Owner: Maintainer
Audience: Maintainer, PM, TM, Reviewer
Review cadence: monthly

## Goal

Run one recurring review for stale, duplicated, broken, or outdated documentation so documentation debt is detected and routed with the same governance vocabulary every month.

## Use With

- [documentation-owner-and-review-cadence.md](documentation-owner-and-review-cadence.md)
- [.github/PULL_REQUEST_TEMPLATE.md](../.github/PULL_REQUEST_TEMPLATE.md)
- [documentation-consolidation-rules.md](documentation-consolidation-rules.md)
- [documentation-archive-policy.md](documentation-archive-policy.md)
- [documentation-inventory.md](documentation-inventory.md)
- [documentation-prioritization-matrix.md](documentation-prioritization-matrix.md)

## Review Trigger

Run this review:

- once per month as part of the recurring documentation maintenance pass
- after a sprint with large workflow or boundary-doc churn
- before defining or refreshing documentation KPIs

## Check Categories

Review the current canonical pages and high-traffic supporting pages for these categories.

| Category | What to look for | Typical signal |
| --- | --- | --- |
| Stale page | metadata or procedure no longer matches current repo or workflow | commands, paths, checks, or branch rules drifted |
| Duplicate page | two pages describe the same topic or procedure as if both are canonical | repeated setup, testing, or boundary steps |
| Broken link | linked page or file no longer resolves | dead markdown links, renamed files, archive moves |
| Outdated guidance | page still resolves but no longer reflects the approved current path | old fallback guidance, superseded workflow, outdated review steps |

## Monthly Review Steps

1. Start from the current operations and governance pages:
   - `README.md`
   - `docs/current/operations/MAINTAINER_GUIDE.md`
   - `docs/current/documentation-governance/documentation-owner-and-review-cadence.md`
2. Recheck the canonical landings for entry, workflow, setup, testing, specification, and operations.
3. Use the current inventory and prioritization docs to focus on the highest-value pages first.
4. Record findings under the four check categories above.
5. Route each finding using the routing rules below.

## Routing Rules

Use the owner keys from [documentation-owner-and-review-cadence.md](documentation-owner-and-review-cadence.md). Do not invent a second routing vocabulary.

| Finding type | Primary route | Action |
| --- | --- | --- |
| Minor stale wording on a canonical page | `Maintainer` | update the page in the next narrow docs ticket or same PR when already touching that area |
| Duplicate procedure text with a clear canonical page already present | `Maintainer` | consolidate to the canonical page and leave redirect or archive handling per the consolidation and archive rules |
| Broken link on contributor or maintainer path | `Maintainer` | fix immediately in the next narrow docs slice; treat as high urgency if it blocks setup, testing, or review flow |
| Outdated testing or gate guidance | `Reviewer` | route to testing / CI docs because correctness depends on active quality gates |
| Outdated ADR or architecture-decision page | `Architect` | route only when the issue is decision-level rather than editorial |
| Scope, ownership, or priority ambiguity | `PM` | escalate through PM instead of making an unscoped governance rewrite |

## PR-Template Cross-Check

When reviewing recent documentation debt, use the same decision rule as the PR template:

- if a code or workflow change should have updated a canonical page, record the missing docs update as debt
- if no update was required, do not create debt without naming the specific canonical page and why it still matches current behavior

This keeps recurring review aligned with the current docs-update check rather than treating maintenance as a separate process.

## Recording Format

For each finding, capture at least:

- page or link
- category
- owner key
- why it is stale, duplicated, broken, or outdated
- next action

Keep the record short. The goal is routing and execution, not a second inventory spreadsheet.

## Escalation Thresholds

Escalate to PM when:

- one finding requires a new ticket because it changes scope or ownership
- multiple pages need a coordinated rewrite instead of a narrow maintenance fix
- the issue exposes a missing canonical page rather than simple drift

Send narrow same-owner fixes directly into the normal PM -> Developer flow without waiting for a larger governance cycle.

## Out Of Scope Here

- KPI definition or dashboard design
- bulk metadata backfill across every page
- large IA rewrites
- implementation of the follow-up docs tickets themselves
