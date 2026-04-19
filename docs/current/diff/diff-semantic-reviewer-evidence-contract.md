# Semantic Diff Reviewer Evidence Contract

Updated: 2026-04-09
Owner: Maintainer
Related ticket: `T-20260408-741`

## Purpose

This document fixes the MVP contract for carrying reviewer traceability from
semantic diff IR output into machine-readable and human-readable compare output.

It covers:

- per-change source evidence
- derived jump-to-evidence navigation targets
- grouped-output traceability rules

It does not cover:

- full WebView or IDE rendering
- line/column navigation UX
- non-MVP semantic layers

## Contract

Each `SemanticChange` may carry:

```ts
interface SemanticChangeEvidence {
  previous?: SemanticSourceRef;
  next?: SemanticSourceRef;
  relatedPaths?: string[];
  reasonSummary?: string;
  navigation?: {
    primary?: NavigationTarget;
    previous?: NavigationTarget;
    next?: NavigationTarget;
  };
}
```

Where `NavigationTarget` is the additive projection:

```ts
interface NavigationTarget {
  side: 'previous' | 'next';
  documentPath?: string;
  entityPath: string;
  location: string; // <documentPath>#<entityPath> or <entityPath>
}
```

## Navigation Rules

1. `previous` and `next` preserve the authored source side when that side exists.
2. `primary` is the preferred jump target for reviewer surfaces.
3. `primary` resolves by change type:
   - `RemoveComponent`: prefer `previous`
   - all other MVP changes: prefer `next`
   - if the preferred side is absent, fall back to the other side
4. `location` is the only string surfaces may assume for direct navigation.
5. If `documentPath` is absent, navigation degrades to path-only using `entityPath`.

## Grouped Output Rule

`ChangeGroup` remains a thin grouping wrapper. It must not invent aggregated evidence
that could blur the underlying atomic evidence. Reviewer-facing grouped output therefore
keeps traceability by rendering each atomic change with its own evidence line.

This preserves:

- per-change jump targets in machine-readable output
- per-change evidence visibility in CLI review flow
- a stable hook for future UI work without recomputing source navigation

## Degraded Cases

- If only one side exists, only that side is populated and `primary` points to it.
- If neither side exists, `navigation` is omitted.
- If a grouped layer has no changes, the group remains empty and emits no evidence.

## MVP Boundary

The semantic diff MVP promises document-and-entity level navigation only. It does not
promise line or column accuracy, link rendering policy, or cross-document include jumps.
