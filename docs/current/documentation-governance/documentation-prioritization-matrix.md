# Documentation Prioritization Matrix

Updated: 2026-03-28
Owner: Maintainer
Audience: Maintainer, PM, TM, Reviewer
Review cadence: monthly

## Goal

Define one prioritization basis for the current docs backlog so Sprint D2 and later cleanup work start from the same ranking instead of ad hoc judgment.

## Inputs

- `docs/current/documentation-governance/documentation-inventory.md`
- `docs/current/documentation-governance/documentation-information-architecture.md`
- `docs/current/documentation-governance/documentation-consolidation-rules.md`

## Scoring Axes

Each backlog cluster is scored on three axes.

| Axis | High | Medium | Low |
|---|---|---|---|
| Onboarding impact | blocks first 30 minutes of setup or daily flow | slows a common workflow but has a workaround | mostly affects niche or maintainer-only work |
| Update frequency | likely to change with many feature or workflow changes | changes occasionally with subsystem work | mostly stable or frozen |
| Misread risk | stale or split guidance can directly send readers to the wrong action | confusion is likely but usually recoverable | mostly contextual or historical confusion only |

## Priority Rules

- `High`: at least two axes are `High`, or one axis is `High` and the page is on the default contributor path.
- `Medium`: mixed `Medium` / `Low` scores with real cleanup value but no immediate onboarding block.
- `Low`: historical, niche, or frozen material that can wait until canonical entry and workflow pages are stable.

## Cluster Matrix

| Cluster | Main pages today | Onboarding impact | Update frequency | Misread risk | Priority |
|---|---|---|---|---|---|
| Entry and workflow home | `README.md`, missing `CONTRIBUTING.md` | High | High | High | High |
| Setup and daily commands | `README.md`, `docs/current/workflow-onboarding/LOCAL_INSTALLER.md`, `docs/current/operations/MAINTAINER_GUIDE.md` | High | Medium | High | High |
| Testing and CI landing | `docs/current/testing-ci/test-matrix.md`, `docs/current/testing-ci/ci-quality-gate.md`, `docs/current/testing-ci/quality-gate-green-main.md`, `docs/current/testing-ci/real-vscode-smoke.md` | High | High | Medium | High |
| Built-in component change workflow | `docs/current/workflow-onboarding/adding-built-in-component.md`, `docs/current/workflow-onboarding/component-add-contract.md`, `docs/current/workflow-onboarding/completion-descriptor-authoring.md`, `docs/current/dsl-ssot-types/component-registration-touchpoints.md`, `docs/current/testing-ci/new-built-in-sample-regression-stub.md` | Medium | High | Medium | High |
| Archive and historical-note separation | historical-note family in live `docs/` root | Medium | Low | Medium | Medium |
| SSoT inventory overlap cleanup | `docs/current/dsl-ssot-types/dsl-types-renderer-types-inventory.md`, `docs/current/dsl-ssot-types/ssot-renderer-types-inventory.md`, `docs/current/dsl-ssot-types/ssot-renderer-types-zero-a1-inventory.md`, `docs/current/dsl-ssot-types/ssot-renderer-types-zero-metrics-dashboard.md` | Medium | Medium | Medium | Medium |
| Owner / audience / review metadata rollout | broad current-doc coverage gap | Medium | Medium | Medium | Medium |
| Runtime boundary overview cleanup | boundary guides and runtime inventories | Medium | Medium | Low | Medium |
| Specification template and glossary lane | future D3 work | Low | Medium | Medium | Medium |
| Release notes and frozen sprint closeouts | historical family only | Low | Low | Low | Low |

## Ranked Backlog

### High

1. Create the workflow entry split:
   Canonical targets are `README.md` for entry, future `CONTRIBUTING.md` for workflow rules, one setup page for environment/bootstrap, and one testing landing page for quality gates.
2. Consolidate setup and daily-command guidance:
   Reduce duplicated setup prose currently split across `README.md`, `docs/current/workflow-onboarding/LOCAL_INSTALLER.md`, and maintainer-oriented pages.
3. Consolidate testing and CI landing guidance:
   Make one landing page that routes to unit / integration / e2e / regression purpose, CI gates, and smoke checks.
4. Normalize built-in component change guidance:
   Shrink overlap between the built-in authoring guides so a contributor does not need to open several pages to add or modify one component safely.

### Medium

1. Define archive handling and move the historical-note family out of the live path once replacement-link rules are operational.
2. Merge or relabel overlapping SSoT inventory pages so policy, measurement, and historical closeout pages are easier to distinguish.
3. Roll out in-file metadata for `Updated`, `Owner`, and `Audience`, starting from canonical entry, workflow, testing, and operations pages.
4. Simplify runtime-boundary overview paths where one lane has both an overview and multiple near-duplicate inventories.
5. Prepare D3 foundation pages such as spec template and glossary after entry / workflow confusion is reduced.

### Low

1. Historical release notes and frozen sprint closeouts can wait until archive moves are available.
2. Niche or investigator-only notes that are already clearly historical do not need to block D2 onboarding work.

## Immediate Sprint Guidance

- `Sprint D2` should start with `README`, `CONTRIBUTING`, setup, and archive policy slices in that order.
- If only one cluster can move first, choose the entry/workflow split because it has `High` on all three axes and unlocks the rest of the docs tree.
- Testing landing work should begin before broader FAQ or glossary work because it sits on the default contributor path.

## Top-Priority Cluster

The single top-priority cluster is:

`README` + future `CONTRIBUTING` + setup landing + testing landing

Reason:

- it sits on the default contributor path
- it directly affects the "setup to main development flow within 30 minutes" outcome
- it currently contains the highest combination of split guidance and missing canonical destinations

## Out Of Scope Here

- rewriting `README.md`
- creating `CONTRIBUTING.md`
- moving archive candidates
- changing current docs content outside prioritization guidance
