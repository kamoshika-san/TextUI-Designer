# Contributing

This page is the canonical contributor workflow for TextUI Designer.

Use [README.md](README.md) for entry and the main documentation map. Use [docs/current/workflow-onboarding/SETUP.md](docs/current/workflow-onboarding/SETUP.md) for environment bootstrap and daily command entry. Use this page for branch strategy, pull request flow, and review expectations.

## Workflow At A Glance

1. Start from [README.md](README.md) and complete the local bootstrap in [docs/current/workflow-onboarding/SETUP.md](docs/current/workflow-onboarding/SETUP.md).
2. Create a focused working branch for one ticket or one tightly coupled slice.
3. Implement the change and run the verification that matches the touched area.
4. Open a pull request with the required context, checks, and doc-update notes.
5. Address review feedback and merge only after the required checks are green.

## Branch Strategy

- Keep `main` releasable.
- Use one branch per ticket or tightly coupled ticket bundle.
- Keep branch names short and purpose-based.
  Example: `feature/react-ssot-c2-3` or `docs/d2-contributing`
- Do not mix unrelated fixes into the same branch just because they are nearby.

## Pull Request Scope

- Keep each PR narrow enough that one reviewer can validate it without reloading the whole repository.
- Match the PR scope to the active ticket.
- Separate code changes, docs rewrites, and follow-up cleanup unless the ticket explicitly bundles them.
- If the work reveals out-of-scope issues, record them for PM instead of silently expanding the branch.

## Required PR Contents

Every PR should make these items easy to find:

- background and ticket link
- changed files or subsystems
- verification commands and results
- risk or rollback note when the change affects runtime behavior
- related docs updates, or an explicit statement that no doc update was needed

Use the repository PR template as the source of truth for the exact checklist:

- [.github/PULL_REQUEST_TEMPLATE.md](.github/PULL_REQUEST_TEMPLATE.md)
- [docs/current/documentation-governance/documentation-owner-and-review-cadence.md](docs/current/documentation-governance/documentation-owner-and-review-cadence.md)
- [docs/current/theme-export-rendering/css-ssot-contributor-checklist.md](docs/current/theme-export-rendering/css-ssot-contributor-checklist.md) when the PR touches component or export CSS

## Review Expectations

Reviewers are expected to focus on:

- regressions in the touched behavior
- missing or weak verification
- requirement drift against the ticket scope
- boundary or SSoT violations
- unclear rollback or operational risk when behavior changes

Authors should respond by:

- fixing same-ticket issues directly on the branch
- keeping follow-up scope changes visible instead of folding them in silently
- updating verification notes when the branch changes materially during review

## Minimum Verification Guidance

Choose the smallest verification set that still proves the touched area.

Common entry points:

- `npm run compile`
- `npm test`
- `npm run test:all:ci`
- `npm run react-ssot-check`
- `npm run check:dsl-types-ssot`
- `npm run metrics:collect`
- `npm run metrics:check:ssot`
- `npm run check:import-graph`

Use the current CI / release-gate page for which checks are required on `main`:

- [docs/current/testing-ci/ci-quality-gate.md](docs/current/testing-ci/ci-quality-gate.md)

Use the test lane guide for what each lane means:

- [docs/current/workflow-onboarding/TESTING.md](docs/current/workflow-onboarding/TESTING.md)
- [docs/current/testing-ci/test-matrix.md](docs/current/testing-ci/test-matrix.md)

## Documentation Update Rule

If the change affects contributor flow, quality gates, runtime boundaries, or canonical contracts, update the related docs in the same PR or state explicitly why no doc change is needed.

Use the current owner and review-cadence model when deciding which canonical page should move:

- [docs/current/documentation-governance/documentation-owner-and-review-cadence.md](docs/current/documentation-governance/documentation-owner-and-review-cadence.md)

Typical examples:

- README or workflow changes -> update [README.md](README.md) or this page
- setup or install changes -> update [docs/current/workflow-onboarding/SETUP.md](docs/current/workflow-onboarding/SETUP.md) and, if needed, [docs/current/workflow-onboarding/LOCAL_INSTALLER.md](docs/current/workflow-onboarding/LOCAL_INSTALLER.md)
- CI / release-gate changes -> update [docs/current/testing-ci/ci-quality-gate.md](docs/current/testing-ci/ci-quality-gate.md)
- built-in component workflow changes -> update [docs/current/workflow-onboarding/adding-built-in-component.md](docs/current/workflow-onboarding/adding-built-in-component.md)
- component or export CSS SSoT changes -> update [docs/current/theme-export-rendering/css-ssot-contributor-checklist.md](docs/current/theme-export-rendering/css-ssot-contributor-checklist.md) or the linked metric definition when the counting rule changes

## When To Escalate Instead Of Expanding

Do not widen a PR when the newly found issue changes:

- ownership
- priority
- ticket scope
- product interpretation

Record the issue for PM when the right next step is a new ticket rather than a larger branch.

## Related Pages

- [README.md](README.md)
- [docs/current/workflow-onboarding/GLOSSARY.md](docs/current/workflow-onboarding/GLOSSARY.md)
- [docs/current/workflow-onboarding/LOCAL_INSTALLER.md](docs/current/workflow-onboarding/LOCAL_INSTALLER.md)
- [docs/current/workflow-onboarding/TESTING.md](docs/current/workflow-onboarding/TESTING.md)
- [docs/current/testing-ci/test-matrix.md](docs/current/testing-ci/test-matrix.md)
- [docs/current/testing-ci/ci-quality-gate.md](docs/current/testing-ci/ci-quality-gate.md)
- [docs/current/operations/MAINTAINER_GUIDE.md](docs/current/operations/MAINTAINER_GUIDE.md)
- [docs/current/theme-export-rendering/css-ssot-contributor-checklist.md](docs/current/theme-export-rendering/css-ssot-contributor-checklist.md)

## Out Of Scope Here

- full setup consolidation
- archive policy
- historical release note handling
- detailed maintainer-only recurring operations
