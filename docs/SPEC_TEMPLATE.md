# Specification Template

Updated: 2026-03-28
Owner: Maintainer
Audience: Maintainer, Reviewer, PM, Contributor

Use this template when you need a current specification page for a behavior, contract, subsystem rule, or planned change that should live in the `Specification / Architecture` lane.

## Template

```md
# <Spec Title>

Updated: YYYY-MM-DD
Owner: <team or role>
Audience: <primary readers>

## Background

- Why this topic needs a canonical spec now
- Which current problem, decision, or change triggered it

## Scope

- What this spec covers
- What is intentionally outside this spec

## Requirements

- Functional or behavioral requirements
- Canonical contract statements

## Non-Functional Notes

- Performance, safety, compatibility, operability, or maintenance constraints

## Constraints

- Technical boundaries
- External compatibility promises
- Rollout or migration limits

## Verification

- Commands, checks, or review evidence that prove the spec is still true

## Change History

- YYYY-MM-DD: created
```

## Minimum Rule

- Keep one spec page per main question.
- Prefer short canonical rules plus links to supporting leaf pages.
- Do not embed historical notes as active guidance; link to archive or ADR pages when needed.

## Use With

- [spec-authoring-guide.md](./spec-authoring-guide.md)
- [documentation-information-architecture.md](./documentation-information-architecture.md)
- [documentation-consolidation-rules.md](./documentation-consolidation-rules.md)
