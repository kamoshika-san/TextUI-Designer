# Documentation Information Architecture

Updated: 2026-03-27

## Goal

Define a single navigation model for project documentation so readers can reach the right page quickly and later cleanup work can merge, archive, or rewrite pages against one agreed structure.

## Audience Lanes

| Lane | Primary reader | Typical question |
|---|---|---|
| Entry | new contributor / occasional contributor | Where do I start and which links matter first? |
| Development Workflow | active developer | How do I set up, run, test, and change the project safely? |
| Runtime Boundaries | developer touching one subsystem | Which module owns this behavior and where is the boundary? |
| Specification / Architecture | designer / maintainer / reviewer | What is the canonical contract or design decision? |
| Testing / Quality Gates | developer / reviewer / CI owner | Which checks exist and when do I run them? |
| Operations / Maintenance | maintainer / PM / TM | How do we keep docs and guards healthy over time? |
| Historical / Archive | investigator | Why did a past decision happen and what replaced it? |

## Top-Level Category Model

| Category | Role in IA | Typical contents | Current examples |
|---|---|---|---|
| `Entry` | shortest path to productive work | project overview, quick start, top links | `README.md` |
| `Development Workflow` | daily execution guidance | setup, commands, built-in component changes, settings | `README.md`, `docs/current/workflow-onboarding/adding-built-in-component.md`, `docs/current/workflow-onboarding/SETTINGS.md` |
| `Runtime Boundaries` | subsystem ownership map | extension, CLI, MCP, exporter, services, runtime coupling | `docs/current/runtime-boundaries/extension-boundary-guide.md`, `docs/current/runtime-boundaries/cli-boundary-guide.md`, `docs/current/runtime-boundaries/mcp-boundary-guide.md`, `docs/current/runtime-boundaries/exporter-boundary-guide.md` |
| `Specification / Architecture` | canonical contracts and ADR-backed design | ADRs, type rules, schema pipeline, theme implementation, provider contracts | `docs/adr/*`, `docs/current/services-webview/schema-pipeline-from-spec.md`, `docs/current/theme-export-rendering/THEME_IMPLEMENTATION.md` |
| `Testing / Quality Gates` | verification and release gates | test matrix, CI gates, smoke guidance, guard matrices | `docs/current/testing-ci/test-matrix.md`, `docs/current/testing-ci/ci-quality-gate.md`, `docs/current/testing-ci/quality-gate-green-main.md`, `docs/current/testing-ci/ssot-import-guard-matrix.md` |
| `Operations / Maintenance` | recurring review and governance | maintainer guide, monthly review, playbooks, roadmap/checklists | `docs/current/operations/MAINTAINER_GUIDE.md`, `docs/current/operations/ssot-monthly-review.md`, `docs/current/operations/ssot-violation-playbook.md`, `docs/current/documentation-governance/documentation-owner-and-review-cadence.md` |
| `Historical / Archive` | superseded context with replacement pointers | release notes, closeout notes, historical sprint input | `docs/archive/RELEASE_NOTES_v*.md`, `docs/archive/ssot-renderer-sprint3-candidates.md` |

## Required Destination Map

| Destination | IA home | Notes |
|---|---|---|
| `README` | `Entry` | Must stay short and link-first; it should not remain the only home for workflow detail |
| `CONTRIBUTING` | `Development Workflow` | Not present yet; reserve it for branch strategy, PR rules, review expectations, and doc-update expectations |
| `setup` | `Development Workflow` | One canonical setup page; OS-specific differences can be nested sections, not separate top-level guides |
| `spec` | `Specification / Architecture` | Specs should separate current canonical contracts from historical notes |
| `test` | `Testing / Quality Gates` | One landing page for unit / integration / e2e / regression purpose and timing |
| `ops` | `Operations / Maintenance` | Maintainer-only recurring tasks, review cadence, playbooks, release checks |
| `archive` | `Historical / Archive` | Archived docs live under `docs/archive/` and must state replacement or reason for retention |

## Placement Rules

1. Keep one topic, one canonical page. Cross-links are fine; duplicated procedure text is not.
2. Put overview pages at the lane entry point and detailed rules in leaf pages.
3. Treat boundary guides as runtime ownership docs, not onboarding docs.
4. Treat ADRs and architecture memos as specification material unless explicitly superseded.
5. Mark historical notes clearly and keep them out of the default reader path.
6. Any future archive move must leave a replacement link or an explicit "historical only" note.
7. New major pages should declare `Updated`, `Owner`, and `Audience` once the governance sprint lands.

## Recommended Reader Paths

### New contributor

1. `README.md`
2. setup page
3. `CONTRIBUTING.md`
4. test policy / CI gate pages

### Daily developer

1. `README.md`
2. subsystem boundary guide for the touched area
3. testing / quality gate page
4. spec or ADR page if changing behavior

### Maintainer / operator

1. `docs/current/operations/MAINTAINER_GUIDE.md`
2. monthly review and playbook pages
3. quality gate / CI docs
4. historical notes only when investigating drift
5. `docs/current/documentation-governance/documentation-owner-and-review-cadence.md` when changing documentation governance

## Near-Term Cleanup Targets

1. Split `README.md` into a short entry page plus links to dedicated setup and contributing pages.
2. Add `CONTRIBUTING.md` as the canonical workflow page instead of expanding `README.md`.
3. Create a single setup page and retire duplicated command/setup prose from scattered docs.
4. Add a testing landing page that points to `test-matrix`, CI gates, smoke guidance, and guard docs.
5. Define an archive folder policy before moving historical notes out of the live path.
6. Use `docs/archive/README.md` as the archive landing page instead of leaving readers in orphaned historical folders.

## Out of Scope Here

- Rewriting `README.md`
- Creating `CONTRIBUTING.md`
- Moving files into an archive directory
- Scoring priority or duplicate rate

## Use With

- `README.md`
- `docs/current/documentation-governance/documentation-consolidation-rules.md`
- `docs/current/documentation-governance/documentation-owner-and-review-cadence.md`
- `docs/current/operations/MAINTAINER_GUIDE.md`
- `docs/current/testing-ci/test-matrix.md`
- `docs/current/testing-ci/ci-quality-gate.md`
