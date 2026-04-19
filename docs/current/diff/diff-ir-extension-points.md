# Diff IR Extension Points

Updated: 2026-03-28
Owner: Maintainer
Related ticket: `T-20260328-127`

## Background

Sprint A1 fixed the minimal Diff IR vocabulary and extraction boundary. That baseline intentionally kept later concerns out of the required payload so the comparison model could stabilize first.

The next requirement is to reserve extension points for state, event, transition, and permission-related comparison concerns without prematurely turning them into mandatory runtime schema. Later tickets in Epic D, G, and I need stable places to attach richer meaning, workflow, and conflict analysis.

## Scope

This page covers:

- reserved extension hooks for state, event, transition, and permission comparison data
- the distinction between minimal required fields and future extension fields
- implementation-neutral handoff notes for downstream epics

This page does not define:

- final semantic-diff text
- workflow-specific PR payloads
- merge conflict resolution schema
- mandatory permission model semantics

## Design Rules

### 1. Minimal required fields stay minimal

The existing required IR fields from Sprint A1 remain authoritative. Extension points must not silently upgrade optional future hooks into new required baseline payload.

### 2. Extension hooks must be explicit

Future phases should not invent opaque blobs. If richer metadata is expected later, the hook should be named now even if its detailed schema is deferred.

### 3. Reserved does not mean populated today

An extension point may be documented as reserved even when current extraction or normalization layers do not emit it yet. The point of this ticket is structural compatibility, not immediate completeness.

## Extension Model

### 1. State extension points

Current required baseline for state remains:

- `stateKey`
- `ownerKey`
- `activation`
- `nodeOverrides`
- `sourceRef`

Reserved state extensions:

- `stateCategory`: reserved hook for lifecycle, UI mode, validation state, permission-conditioned state, and similar later categorization
- `activationRef`: reserved hook for structured trigger identity beyond a display description
- `stateEffects`: reserved hook for downstream semantic or workflow analysis of what the state changes
- `permissionContextRef`: reserved hook when a state is activated or constrained by permission logic

Downstream notes:

- Epic D may use `stateCategory` and `stateEffects` to summarize meaning changes
- Epic I may later depend on structured `activationRef` for merge reasoning around state conflicts

### 2. Event extension points

Current required baseline for event remains:

- `eventKey`
- `ownerKey`
- `eventType`
- `payloadShape`
- `sourceRef`

Reserved event extensions:

- `eventPhase`: reserved hook for lifecycle phase or dispatch stage
- `eventRef`: reserved hook for stable linkage between authored event declarations and downstream consumers
- `eventGuards`: reserved hook for structured preconditions
- `eventEffects`: reserved hook for normalized side-effect or outcome summaries

Downstream notes:

- Epic D may use `eventEffects` for reviewer-facing meaning summaries
- Epic G may later surface `eventRef` and `eventPhase` in CLI or PR output

### 3. Transition extension points

Current required baseline for transition remains:

- `transitionKey`
- `fromScreenKey`
- `toScreenKey`
- `triggerEventKey`
- `guardRef`
- `sourceRef`

Reserved transition extensions:

- `transitionKind`: reserved hook for navigation, modal open, tab switch, async branch, permission gate, and similar categories
- `transitionEffects`: reserved hook for downstream change summaries or impact analysis
- `guardDetailRef`: reserved hook for richer condition structure when `guardRef` alone is too thin
- `fallbackTransitionRef`: reserved hook for alternative branch linkage

Downstream notes:

- Epic D may classify impact using `transitionKind` and `transitionEffects`
- Epic G may expose transition-level workflow summaries from these hooks
- Epic I may later use `fallbackTransitionRef` during conflict or merge analysis

### 4. Permission extension points

Permission is still not a required first-class minimal unit in Sprint A1, but the IR needs an explicit place to grow.

Reserved permission hooks:

- `permissionContextRef` on screen, node, state, event, and transition units when access rules constrain visibility or behavior
- `permissionRuleRef` as a structured pointer to the authored permission condition
- `permissionEffectKind` as a reserved categorization hook such as hidden, disabled, readonly, gated-transition, or state-limited

Rules:

- permission hooks are reserved attachment points, not a separate mandatory top-level IR unit in Epic A
- later extraction or normalization work may populate these hooks only when the DSL actually expresses permission-related logic

Downstream notes:

- Epic D needs these hooks so permission changes can later become semantic-diff statements
- Epic G may surface permission-sensitive alerts in workflow output

## Attachment Rules

- state extensions attach to state records
- event extensions attach to event records
- transition extensions attach to transition records
- permission hooks may attach to any reviewable unit whose behavior or visibility is permission-constrained

These hooks must remain close to the owning unit instead of being moved into a disconnected global blob, so later reviewers and tooling can preserve local reasoning context.

## Source And Extraction Expectations

- extraction is not required to populate every reserved hook today
- when a reserved hook is populated later, it must still preserve `sourceRef` traceability through the owning unit
- normalization may later canonicalize hook values, but the hook names themselves should remain stable once introduced

## Interaction With Existing Vocabulary

- this page extends the minimal vocabulary from `docs/current/diff/diff-ir-vocabulary.md` without replacing it
- this page stays consistent with the extraction boundary in `docs/current/diff/diff-ir-extraction-contract.md`
- this page does not weaken the identity rules already fixed in `docs/current/diff/diff-ir-identity-policy.md`

## Verification

- Confirm each extension hook attaches to an existing IR unit instead of inventing a new disconnected top-level concept
- Confirm minimal required fields remain distinguishable from reserved future hooks
- Confirm permission growth path exists without making permission a mandatory baseline payload today
- Confirm Epic D, G, and I can reference these hook names without redefining the extension surface

## Change History

- 2026-03-28: Initial state/event/transition/permission extension-point map for Diff Engine Epic A / Sprint A3 / `T-20260328-127`.
