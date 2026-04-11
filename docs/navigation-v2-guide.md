# Navigation v2 Guide

Use Navigation v2 when a `.tui.flow.yml` file needs graph-aware behavior beyond a simple linear screen sequence.

Navigation v2 keeps the readable authoring shape from v1:

- `flow.screens[]` is the node list
- `flow.transitions[]` is the edge list
- `flow.entry` is the traversal start

At runtime, the extension treats that document as a directed graph. Shared helpers build adjacency, reverse adjacency, terminal lookup, and route search from the same authoring source.

For the contract history, start with [ADR 0010](./adr/0010-navigation-dsl-design.md) for the Phase 1 baseline and [ADR 0011](./adr/0011-navigation-v2-graph-model.md) for the graph-first expansion.

## When To Use v2

Choose v2 when one or more of these are true:

- You need branching, retry, review-back, or loop semantics to be explicit.
- You want route search from `entry` to a target screen or terminal kind.
- You want stable transition identity for semantic diff, diagnostics, or exported metadata.
- You want terminal outcomes such as `success`, `failure`, `cancel`, or `handoff` to be machine-readable.

If your flow is only a small linear sample and does not need graph-aware semantics yet, v1 shape is still valid.

## Core Additions

Navigation v2 adds optional metadata on top of the v1 baseline.

### Flow-level metadata

```yaml
flow:
  version: "2"
  policy:
    loops: allow
    terminalScreensRequired: true
```

- `version: "2"` marks the graph-first contract explicitly.
- `policy.loops` controls cycle diagnostics:
  - `deny`: cycles are validation errors
  - `warn`: cycles are warnings
  - `allow`: cycles are accepted without cycle issues
- `policy.terminalScreensRequired: true` requires at least one terminal screen

### Screen-level metadata

```yaml
- id: launch
  page: ./screens/launch.tui.yml
  title: Launch
  kind: terminal
  tags: [go-live]
  terminal:
    kind: success
    label: Customer live
    outcome: onboarding-complete
```

- `kind` classifies the screen as `screen`, `decision`, `review`, or `terminal`
- `tags` are free-form labels for authoring and downstream tooling
- `terminal` adds machine-readable outcome semantics

### Transition-level metadata

```yaml
- id: t-approval-provisioning
  from: approval
  to: provisioning
  trigger: approve
  label: Approve rollout
  kind: forward
  guard:
    expression: risk.accepted
    params: [tenantId]
```

- `id` is the stable transition identity
- `kind` classifies the edge as `forward`, `branch`, `backtrack`, `retry`, `loop`, or `escalation`
- `guard` is the structured companion to legacy `condition` and `params`

`condition` and `params` remain valid for compatibility. They can coexist with `guard`.

## Authoring Recommendations

### 1. Add `transition.id` whenever the edge matters downstream

Stable ids are the safest choice when any of these are important:

- semantic diff
- diagnostics and evidence
- exported metadata
- long-lived business flows with many similar edges

Without `transition.id`, the fallback identity is `from::trigger::to`.

### 2. Mark real endpoints as terminal screens

Use `screen.kind: terminal` together with `screen.terminal.kind` when a screen is a real outcome, not just the last step in a happy-path sample.

This improves:

- route search to terminal kinds
- validator clarity
- exporter metadata
- reviewer understanding of success vs failure endpoints

### 3. Set loop policy intentionally

Use `policy.loops` to match the business meaning of the flow:

- `deny` for samples that should stay acyclic
- `warn` when loops are acceptable but deserve review
- `allow` for workflows with deliberate retry or reopen paths

Do not rely on implicit defaults when loops are business-critical.

### 4. Keep authoring array-based

Do not convert `screens` or `transitions` into ad hoc maps. The current contract keeps arrays as the canonical authoring shape, and shared runtime helpers build graph indexes from them.

## CLI And MCP Usage

The graph-first contract is available through the flow tooling surface.

### CLI

Validate a flow:

```bash
npx textui flow validate --file sample/13-enterprise-flow/app.tui.flow.yml --json
```

Inspect graph-aware reachability and terminal data:

```bash
npx textui flow analyze --file sample/13-enterprise-flow/app.tui.flow.yml --json
```

Find a route to a success terminal:

```bash
npx textui flow route --file sample/13-enterprise-flow/app.tui.flow.yml --to-terminal-kind success --json
```

### MCP

Use these tool names:

- `validate_flow`
- `analyze_flow`
- `route_flow`

`route_flow` requires either `toScreenId` or `toTerminalKind`.

## Exporter And Diff Behavior

Navigation v2 metadata now affects more than validation.

- Exporters preserve terminal kind and outgoing transition identity in generated flow output.
- Semantic diff uses stable transition ids when present.
- Flow diff can report updates to:
  - flow policy metadata
  - screen terminal metadata
  - transition metadata such as trigger, kind, and guard

This is why `transition.id` and `screen.terminal` are worth adding even when the authoring document already reads clearly to humans.

## Recommended Samples

Use these repository samples as references:

- [`sample/12-navigation`](../sample/12-navigation/README.md): v1-style baseline for simple validation and diagnostics
- [`sample/13-enterprise-flow`](../sample/13-enterprise-flow/README.md): representative v2 flow with branch, backtrack, retry, escalation, loop, and terminal semantics

## Checklist

Before calling a flow "Navigation v2 ready", confirm:

- `flow.version` is set to `"2"`
- important transitions have stable `id`
- real outcomes are modeled with `screen.terminal`
- `policy.loops` matches intended business behavior
- at least one terminal screen exists when `terminalScreensRequired` is enabled
- the flow passes `flow validate`

