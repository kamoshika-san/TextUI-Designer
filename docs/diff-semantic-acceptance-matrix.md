# Semantic Diff MVP Acceptance Matrix

Updated: 2026-04-09
Owner: Maintainer
Related ticket: `T-20260408-742`

## Purpose

This matrix locks the intended MVP behavior for semantic diff review flow after
Sprint 1 normalization, Sprint 2 mapping, and Sprint 3 compare output work.

It is intentionally compact. The goal is to guard reviewer trust, not to enumerate
all DSL combinations.

## Acceptance Cases

| Case | Pattern | Expected outcome | Protected by |
|---|---|---|---|
| `SD-A001` | stable component label change | `UpdateProps` with reviewer-readable text and retained evidence | `tests/unit/semantic-diff-engine.test.js` |
| `SD-A002` | stable navigation event target change | `UpdateEvent` with `high` impact and next-side primary navigation | `tests/unit/semantic-diff-engine.test.js`, `tests/unit/cli.test.js` |
| `SD-A003` | stable component gains `href` or `onClick` | absent-to-present delta still emits semantic change | `tests/unit/semantic-diff-engine.test.js` |
| `SD-A004` | cross-parent relocation with stable identity | `MoveComponent`, not remove-plus-add | `tests/unit/semantic-diff-engine.test.js` |
| `SD-A005` | ambiguous duplicated stable id candidates | conservative remove-plus-add fallback with ambiguity marker | `tests/unit/semantic-diff-engine.test.js` |
| `SD-A006` | human-readable compare output | summary, grouped layer headings, and per-change evidence remain visible | `tests/unit/cli.test.js` |
| `SD-A007` | machine-readable compare output | JSON result keeps semantic evidence navigation hooks | `tests/unit/cli.test.js` |
| `SD-A008` | normalization equivalence for defaults / shorthand | semantic-noise boundary stays fixed before diffing | `tests/fixtures/normalization-golden/*` |

## Explicit Non-Acceptance

The MVP does not accept these as required behavior:

- visual diff expansion beyond the current prop subset
- condition or binding semantic output
- full include-aware compare traversal
- line-accurate source jumps
- broad snapshot suites that duplicate the focused semantic diff checks

## Regression Priorities

When this slice regresses, fix in this order:

1. traceability loss in machine-readable or grouped review output
2. false-negative prop/event deltas on stable nodes
3. move-versus-remove-add continuity errors
4. reviewer wording drift that hides impact or destination changes
