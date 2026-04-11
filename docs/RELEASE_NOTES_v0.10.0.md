# Release Notes v0.10.0

## Summary

v0.10.0 promotes Navigation v2 from an implementation detail to a rollout-ready workflow for graph-first `.tui.flow.yml` authoring.

This release adds:

- graph-aware flow analysis and route search
- terminal-aware validation and loop policy handling
- stable transition identity for diff and exporter surfaces
- representative v2 samples and migration guidance

## Compatibility

### Compatible

Existing v1-style navigation documents remain valid.

You can continue using:

- `flow.entry`
- `flow.screens[]`
- `flow.transitions[]`
- legacy `condition` and `params`

without adding Navigation v2 metadata.

### Migration-required

Treat migration to Navigation v2 metadata as required when your workflow depends on:

- intentional loops or reopen paths
- stable transition identity for diff, diagnostics, or export
- terminal-aware route search
- machine-readable success, failure, cancel, or handoff outcomes

## Breaking Changes

There is no schema-level breaking change for existing navigation documents in this release.

The practical rollout risk is behavioral rather than syntactic:

- flows with business-critical loops should now set `flow.policy.loops` intentionally
- flows that need stable edge identity should now add `transition.id`
- flows that need endpoint-aware tooling should now model `screen.terminal`

## What To Migrate First

Recommended order:

1. Add `flow.version: "2"`
2. Add terminal metadata to real outcome screens
3. Add stable `transition.id` to important edges
4. Add `screen.kind` and `transition.kind`
5. Set `flow.policy.loops` and `terminalScreensRequired`
6. Add `guard` alongside legacy `condition` and `params` where structure matters

## Tooling Impact

Navigation v2 is now reflected across the shipped tooling surface:

- CLI: `flow validate`, `flow analyze`, `flow route`
- MCP: `validate_flow`, `analyze_flow`, `route_flow`
- validator: loop policy and terminal screen enforcement
- exporter / semantic diff: terminal metadata and stable transition identity
- sample validation gate: baseline and representative navigation samples are checked directly

## Recommended References

- [`docs/navigation-v2-guide.md`](./navigation-v2-guide.md)
- [`docs/navigation-v2-migration.md`](./navigation-v2-migration.md)
- [`sample/12-navigation/README.md`](../sample/12-navigation/README.md)
- [`sample/13-enterprise-flow/README.md`](../sample/13-enterprise-flow/README.md)
