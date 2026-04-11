# 13-enterprise-flow

Representative Navigation v2 sample for migration, regression, and rollout checks.

## Purpose

Use this sample when you need the repository's primary graph-first flow example:

- Navigation v2 migration reference
- graph-aware CLI and MCP checks
- exporter and semantic diff regression coverage
- reviewer conversations about branch, retry, loop, and terminal semantics

## What It Covers

- `version: "2"` graph-first metadata
- `policy.loops: allow`
- `policy.terminalScreensRequired: true`
- stable `transition.id` on every edge
- screen kinds such as `decision`, `review`, and `terminal`
- terminal metadata on `launch`
- branch, backtrack, retry, escalation, and loop edges

## Representative Paths

- happy path: `welcome -> company-profile -> admin-setup -> billing -> compliance -> integrations -> review -> approval -> provisioning -> launch`
- retry path: `approval -> review`
- loop path: `launch -> review` and `launch -> provisioning`
- branch path: `company-profile -> compliance`

## Recommended Uses

- Use this sample for `flow analyze`, `flow route`, and v2 validator checks.
- Use this sample when testing terminal-aware exports or semantic diff.
- Use this sample as the reviewer reference when a ticket claims Navigation v2 coverage.

## When To Use Another Sample

If you only need the minimal Phase 1 baseline without v2 metadata, use [`../12-navigation`](../12-navigation/README.md).
