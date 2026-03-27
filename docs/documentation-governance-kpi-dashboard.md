# Documentation Governance KPI Dashboard

Updated: 2026-03-28
Owner: Maintainer
Audience: Maintainer, PM, TM, Reviewer
Review cadence: monthly

## Goal

Define one reviewable KPI set for documentation governance so a later dashboard or report can measure drift without reopening vocabulary, ownership, or routing decisions.

## Use With

- [documentation-owner-and-review-cadence.md](documentation-owner-and-review-cadence.md)
- [documentation-doc-debt-runbook.md](documentation-doc-debt-runbook.md)
- [.github/PULL_REQUEST_TEMPLATE.md](../.github/PULL_REQUEST_TEMPLATE.md)
- [documentation-information-architecture.md](documentation-information-architecture.md)

## Dashboard Scope

This page defines:

- which documentation-governance KPIs exist
- what each KPI measures
- which approved source or review input feeds it
- how a future dashboard should group and display the metrics

This page does not implement automation, collection scripts, or a reporting UI.

## KPI Set

| KPI | What it measures | Source or review input | Review cadence | Why it matters |
| --- | --- | --- | --- | --- |
| Canonical owner coverage | share of canonical and governance pages that declare `Owner` metadata using the approved owner keys | page metadata on canonical pages, owner-key policy in [documentation-owner-and-review-cadence.md](documentation-owner-and-review-cadence.md) | monthly | shows whether routing can work without guessing |
| Review-cadence coverage | share of governance, operations, testing, and high-drift spec pages that declare `Review cadence` metadata | page metadata plus cadence rules in [documentation-owner-and-review-cadence.md](documentation-owner-and-review-cadence.md) | monthly | shows whether pages can be checked on time |
| Overdue cadence misses | count of pages whose declared cadence says they should have been reviewed or updated already | page metadata, monthly review record, and lane cadence rules | monthly | highlights where governance expectations are no longer being met |
| Docs-update check compliance | share of reviewed PRs that explicitly recorded whether canonical docs changed and why | `.github/PULL_REQUEST_TEMPLATE.md` sections and PR review notes | per change, summarized monthly | shows whether documentation impact is being considered during normal development flow |
| Open Doc Debt findings | count of unresolved monthly-review findings by category: stale, duplicate, broken link, outdated guidance | [documentation-doc-debt-runbook.md](documentation-doc-debt-runbook.md) finding records | monthly | tracks current governance backlog instead of anecdotal debt |
| Broken-link count | count of unresolved broken-link findings on entry, workflow, setup, testing, and operations paths | monthly Doc Debt findings, focused docs state checks | monthly | protects the shortest contributor path |
| Duplicate-canonical conflicts | count of active duplicate findings where more than one page still behaves as if it is canonical | monthly Doc Debt findings plus consolidation-rule review | monthly | shows whether "one topic, one canonical page" is holding |

## Metric Definitions

### Canonical owner coverage

- Numerator: canonical or governance pages that declare `Owner` with one of `Maintainer`, `Reviewer`, or `Architect`
- Denominator: canonical and governance pages currently expected to carry metadata under the approved IA and owner model
- Target direction: up

### Review-cadence coverage

- Numerator: pages in governance, operations, testing / CI, and high-drift specification lanes that declare `Review cadence`
- Denominator: pages in those lanes that the owner / cadence model says should carry it
- Target direction: up

### Overdue cadence misses

- Count pages whose metadata cadence implies a review should already have happened but no current-cycle review evidence exists
- Treat `per change` pages as overdue only when the underlying workflow, contract, or gate changed without a matching docs update
- Treat `monthly` pages as overdue when the current monthly review has not covered them
- Target direction: down

### Docs-update check compliance

- Count reviewed PRs that answered the docs-update check in the template with either:
  - docs updated and canonical links adjusted, or
  - no docs update needed with an explicit reason
- Exclude PRs outside normal contributor flow only when the review note says the template did not apply
- Target direction: up

### Open Doc Debt findings

- Count unresolved findings grouped by:
  - stale page
  - duplicate page
  - broken link
  - outdated guidance
- Use the category vocabulary from the Doc Debt runbook exactly as written
- Target direction: down

### Broken-link count

- Count unresolved broken-link findings that affect:
  - `README.md`
  - `CONTRIBUTING.md`
  - `docs/SETUP.md`
  - `docs/TESTING.md`
  - governance / operations pages used for recurring maintenance
- Target direction: down

### Duplicate-canonical conflicts

- Count unresolved duplicate findings where routing still leaves readers with more than one apparent source of truth
- Do not count historical / archive pages when they clearly point to a replacement
- Target direction: down

## Dashboard Layout For A Future Slice

A later dashboard or recurring report should show:

1. Coverage
   - canonical owner coverage
   - review-cadence coverage
2. Current risk
   - overdue cadence misses
   - broken-link count
   - duplicate-canonical conflicts
3. Work-in-flow
   - docs-update check compliance
   - open Doc Debt findings by category

Keep the dashboard grouped this way so maintainers can separate metadata adoption, current breakage risk, and process compliance.

## Minimum Inputs Needed

A future dashboard should be able to answer each KPI from these inputs:

- current canonical-page list from the approved documentation IA
- page metadata on canonical and governance docs
- monthly Doc Debt review findings
- reviewed PR records that used the current PR template

If any KPI cannot be populated from those inputs, the dashboard slice should add a narrow collection step instead of redefining the KPI.

## Review Notes

- Measure against the approved owner keys and cadence vocabulary only.
- Prefer counts and coverage ratios over subjective health scores.
- Keep the first dashboard limited to governance metrics for current docs flow; do not add traffic analytics or external usage telemetry in this phase.

## Out Of Scope Here

- dashboard implementation
- automation or scripts
- bulk metadata backfill
- changing the owner / cadence model
- changing the Doc Debt runbook categories
