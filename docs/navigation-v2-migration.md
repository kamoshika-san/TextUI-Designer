# Navigation v2 Migration Guide

This guide explains when an existing `.tui.flow.yml` file can stay on the Phase 1 baseline and when it should adopt Navigation v2 metadata.

For the contract background, read [ADR 0010](./adr/0010-navigation-dsl-design.md) first and [ADR 0011](./adr/0011-navigation-v2-graph-model.md) second.

## Quick Decision

Treat a flow as one of these cases.

### Compatible: no migration required yet

Your current document can stay as-is when:

- the flow is mostly linear
- there is no need for terminal-aware route search
- fallback transition identity `from::trigger::to` is enough
- loops are not part of the intended behavior

In this case, the v1 baseline remains valid.

### Recommended migration

Move to v2 when:

- the flow has meaningful branch, retry, review-back, escalation, or loop paths
- reviewers need explicit success or failure endpoints
- semantic diff or exporter output should preserve stable edge identity
- CLI or MCP route queries should target terminal kinds reliably

### Migration-required

Treat migration as required for the document when:

- a business flow depends on real loops and the default cycle behavior would be misleading
- multiple transitions would otherwise share the same fallback identity and become ambiguous downstream
- success, failure, cancel, or handoff endpoints must be machine-readable
- PM, Reviewer, or CI policy needs graph-aware validation rather than a plain authoring skeleton

## v1 To v2 Mapping

Start from the Phase 1 baseline:

```yaml
flow:
  id: checkout
  title: Checkout Flow
  entry: cart
  screens:
    - id: cart
      page: ./screens/cart.tui.yml
    - id: confirm
      page: ./screens/confirm.tui.yml
  transitions:
    - from: cart
      to: confirm
      trigger: next
```

Then add only the metadata your flow needs.

### Step 1: mark the document as v2

```yaml
flow:
  version: "2"
```

This is the clearest signal that the file is intentionally using graph-first semantics.

### Step 2: add loop and terminal policy

```yaml
flow:
  policy:
    loops: warn
    terminalScreensRequired: true
```

Use this when the team wants validator behavior to reflect the business meaning of cycles and endpoints.

### Step 3: classify important screens

```yaml
- id: review
  page: ./screens/review.tui.yml
  kind: review

- id: launch
  page: ./screens/launch.tui.yml
  kind: terminal
  terminal:
    kind: success
    outcome: onboarding-complete
```

This is the minimum useful upgrade for terminal-aware tooling.

### Step 4: stabilize transition identity

```yaml
- id: t-review-launch
  from: review
  to: launch
  trigger: approve
  kind: forward
```

If you skip `id`, the fallback identity becomes `review::approve::launch`.

### Step 5: move important conditions into `guard`

Legacy shape:

```yaml
- from: review
  to: approval
  trigger: submit
  condition: profile-complete
  params: [tenantId]
```

Structured v2 companion:

```yaml
- from: review
  to: approval
  trigger: submit
  condition: profile-complete
  params: [tenantId]
  guard:
    expression: profile-complete
    params: [tenantId]
```

You do not need to remove `condition` and `params` immediately. They remain compatible.

## Compatibility Matrix

### Safe additive changes

These are backward-compatible within the current repository contract:

- adding `flow.version: "2"`
- adding `flow.policy`
- adding `screen.kind`
- adding `screen.tags`
- adding `screen.terminal`
- adding `transition.id`
- adding `transition.kind`
- adding `transition.tags`
- adding `transition.guard`

### Changes that may alter behavior

These are still schema-compatible, but they change runtime or validation meaning:

- setting `policy.loops: deny|warn|allow`
- enabling `terminalScreensRequired`
- adding terminal metadata that changes route query targets
- assigning stable `transition.id` that replaces fallback edge identity downstream

### Breaking at the workflow level

These are not schema breaks, but they can break workflow assumptions and should be treated as migration-required:

- changing a previously acyclic flow into a loop-heavy flow without setting loop policy
- leaving multiple semantically distinct edges on fallback identity when stable ids are needed
- depending on terminal-aware routing without modeling terminal screens

## Validator Expectations

When you migrate a file, validate it with the flow lane:

```bash
npx textui flow validate --file <path-to-flow> --json
```

Pay attention to these migration-sensitive areas:

- unknown `entry`, `from`, or `to` references
- duplicate transition identity
- loop severity controlled by `policy.loops`
- missing terminal screens when `terminalScreensRequired` is enabled

## Suggested Migration Path

Use this order for low-risk migration:

1. Add `version: "2"` and keep the rest unchanged.
2. Add terminal metadata to real endpoints.
3. Add stable `transition.id` to important or ambiguous edges.
4. Add `kind` metadata to screens and transitions.
5. Set `policy.loops` and `terminalScreensRequired` once the team agrees on validator behavior.
6. Add `guard` alongside legacy `condition` and `params` where structured semantics matter.

This sequence keeps the migration additive and reviewable.

## Sample-Based Migration Reference

Use these repository examples:

- [`sample/12-navigation`](../sample/12-navigation/README.md): baseline v1-style sample
- [`sample/13-enterprise-flow`](../sample/13-enterprise-flow/README.md): representative v2 flow after migration

If you are migrating a business workflow rather than a toy sample, prefer the `13-enterprise-flow` shape as the reference point.

## Reviewer Checklist

During migration review, confirm:

- the document still passes `flow validate`
- terminal semantics are present only where they mean real outcomes
- loops are explicitly allowed or warned when intentional
- transition ids are stable and non-duplicated
- docs, sample intent, and validator behavior all describe the same workflow

