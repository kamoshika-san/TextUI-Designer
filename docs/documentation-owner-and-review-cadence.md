# Documentation Owner And Review Cadence

Updated: 2026-03-28
Owner: Maintainer
Audience: Maintainer, PM, TM, Reviewer
Review cadence: monthly

## Goal

Define one operating model for who owns each documentation lane and how often that lane should be reviewed. This policy is the governance baseline for later PR-template, Doc Debt, and KPI work.

## Owner Keys

Use only these owner keys in documentation governance work unless a later ticket explicitly expands the model.

| Owner key | Role |
| --- | --- |
| `Maintainer` | onboarding, workflow, runtime, specification, and operations pages that change with normal project work |
| `Reviewer` | testing, CI, release-gate, and verification policy pages that must track active quality gates |
| `Architect` | ADRs and architecture-decision records that act as canonical long-lived design references |

## Lane Ownership Model

| Lane | Typical pages | Default owner | Review cadence | Review trigger |
| --- | --- | --- | --- | --- |
| Entry | `README.md` | `Maintainer` | monthly | contributor entry flow changes |
| Development Workflow | `CONTRIBUTING.md`, `docs/SETUP.md`, built-in component workflow docs | `Maintainer` | per change | setup, workflow, or contributor-process changes |
| Runtime Boundaries | boundary guides, coupling inventories, service ownership docs | `Maintainer` | per change | subsystem boundary or ownership changes |
| Specification / Architecture | spec guide, spec template, canonical contract docs | `Maintainer` | per change | contract, schema, token, or behavior changes |
| ADR Catalog | `docs/adr/*.md` | `Architect` | on decision | architecture decision accepted or superseded |
| Testing / Quality Gates | `docs/TESTING.md`, CI gate docs, guard matrices, smoke docs | `Reviewer` | per change | test lane, gate, or release-check changes |
| Operations / Maintenance | maintainer playbooks, monthly reviews, governance docs | `Maintainer` | monthly | recurring maintenance review or process update |
| Historical / Archive | archived notes and superseded docs | `Maintainer` | frozen unless referenced | archive move, replacement, or retention-note change |

## Page-Level Metadata Rule

Canonical and governance-relevant pages should declare:

- `Updated`
- `Owner`
- `Audience`

Add `Review cadence` when the page is:

- governance-related
- operations-related
- testing / CI related
- a high-drift specification page

Supporting leaf pages may omit `Review cadence` when their update trigger is obvious from the canonical parent, but they should still inherit an owner.

## Assignment Rules

1. Each canonical page gets one primary owner key.
2. Supporting pages should usually inherit the owner of their canonical parent.
3. If a page is reviewed often for correctness rather than prose maintenance, prefer `Reviewer`.
4. If a page records an architecture decision rather than operational guidance, prefer `Architect`.
5. Do not create ad hoc owner labels such as team nicknames or individual names in this phase.

## Current Repo Starting Point

Apply this model immediately to:

- `README.md` and workflow / setup landings under the `Maintainer` lane
- `docs/TESTING.md`, `docs/ci-quality-gate.md`, and related gate docs under the `Reviewer` lane
- `docs/adr/*.md` under the `Architect` lane
- governance docs such as archive, consolidation, prioritization, and this policy under the `Maintainer` lane

## Review Cadence Rules

Use these cadence meanings consistently:

| Cadence | Meaning |
| --- | --- |
| `per change` | review whenever the underlying workflow, contract, or gate changes |
| `monthly` | review during the recurring maintenance pass even if no major code change landed |
| `on decision` | review only when an architecture decision is added, amended, or superseded |
| `frozen unless referenced` | do not routinely review; touch only for archive, replacement, or investigation reasons |

## D4 Follow-Through

- `DOC-302`: PR-template checks should point at this owner / cadence model instead of inventing a separate one.
- `DOC-303`: the Doc Debt runbook should use these owner keys when routing stale pages.
- current runbook: [documentation-doc-debt-runbook.md](documentation-doc-debt-runbook.md)
- `DOC-304`: KPI definitions should measure owner coverage and overdue cadence misses against this policy.
- current KPI definition: [documentation-governance-kpi-dashboard.md](documentation-governance-kpi-dashboard.md)

## Out Of Scope Here

- editing every current page to add metadata
- PR-template implementation
- Doc Debt runbook implementation
- KPI dashboard implementation
