# Spec Authoring Guide

Updated: 2026-03-28
Owner: Maintainer
Audience: Contributor, Maintainer, Reviewer, PM

This page is the canonical authoring landing for new specification pages.

## When To Create A Spec

Create or rewrite a spec when:

- a current behavior or boundary needs one canonical contract page
- several docs repeat the same rule and need one source of truth
- a reviewer or maintainer would otherwise need ADRs, notes, and implementation docs open at once to infer the current rule

Do not create a new spec when:

- a current canonical page already answers the same reader question
- the content is only historical context
- the content belongs in setup, workflow, testing, or archive guidance instead of `Specification / Architecture`

## Where It Lives

- Put current specification pages under `docs/`.
- Keep archive-only or superseded notes under `docs/archive/` once they meet the archive policy.
- Use one canonical spec page plus supporting leaf pages when detail would make the canonical page harder to scan.

## Required Structure

Start from:

- [SPEC_TEMPLATE.md](./SPEC_TEMPLATE.md)

Minimum sections:

1. `Background`
2. `Scope`
3. `Requirements`
4. `Non-Functional Notes`
5. `Constraints`
6. `Verification`
7. `Change History`

## Placement Rule

- If the page answers a design or contract question, place it in the `Specification / Architecture` lane.
- If the page answers a daily execution question, do not turn it into a spec; place it in workflow, testing, or operations docs instead.
- If the page mainly preserves past context, treat it as historical rather than as a current spec.

## Link Rule

- Canonical specs may link to ADRs, inventories, boundary guides, or supporting matrices.
- Supporting pages should link back to the canonical spec instead of restating the full contract.
- Entry pages such as `README.md` should only carry narrow links to the spec lane, not the full spec text.

## Related

- [SPEC_TEMPLATE.md](./SPEC_TEMPLATE.md)
- [documentation-information-architecture.md](./documentation-information-architecture.md)
- [documentation-consolidation-rules.md](./documentation-consolidation-rules.md)
- [documentation-archive-policy.md](./documentation-archive-policy.md)
