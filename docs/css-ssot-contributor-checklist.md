# CSS SSoT Contributor Checklist

Updated: 2026-03-28
Owner: Maintainer
Audience: Developer, Reviewer
Review cadence: per change

## Goal

Give contributors one narrow checklist for CSS source-of-truth work so new component changes do not silently reintroduce inline utility drift or fallback-only CSS expansion.

## Use With

- [css-ssot-metrics-definition.md](css-ssot-metrics-definition.md)
- [.github/PULL_REQUEST_TEMPLATE.md](../.github/PULL_REQUEST_TEMPLATE.md)
- [CONTRIBUTING.md](../CONTRIBUTING.md)

## When To Use This

Use this checklist when a PR:

- adds a new built-in component
- changes `src/renderer/components/*.tsx`
- changes `src/renderer/components/styles/*`
- changes export-side CSS in `src/shared/layout-styles.ts` or `src/exporters/html-template-builder.ts`

## Checklist

- Prefer canonical `.textui-*` selectors over new presentational utility classes in built-in renderer components.
- If inline utility classes remain, keep them narrow and explain why they are not yet moved into canonical component CSS.
- Do not reintroduce `TODO partial` markers for component-layer CSS without a parent ticket and explicit removal plan.
- Treat fallback compatibility CSS as append-only compatibility debt, not as the default place for new styling work.
- If a change touches fallback compatibility selectors, record why the Primary path was not the right implementation target.
- Check whether this PR changes one of the approved CSS SSoT metrics in [css-ssot-metrics-definition.md](css-ssot-metrics-definition.md).
- If a metric changes, call out which metric moved and why in the PR description or review handoff.

## Review Notes

Reviewers should read this checklist together with the metric definitions:

- metric definitions decide what is counted
- this checklist decides what contributors must think through before opening the PR

Keep the checklist narrow. It is not a substitute for CI enforcement.

## Out Of Scope Here

- metric automation
- CI gate implementation
- component CSS rewrites
