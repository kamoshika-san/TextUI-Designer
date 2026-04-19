# Diff Workflow Config and Feature Gate (G3-1)

Updated: 2026-03-29
Owner: Maintainer
Related ticket: `T-20260328-192`

## Purpose

This document defines the configuration surface and feature gate model for
staged introduction of the TextUI diff workflow.  It determines which enablement
axes exist, how strict vs advisory mode differ, and where gate boundaries sit to
protect external consumers and extension hooks.

It specifies:
- the three enablement axes (local-only / CI-only / PR-enabled)
- strict mode vs advisory mode semantics
- feature gate boundary rules that protect consumers and hooks
- configuration key naming conventions

It does not specify:
- how configuration is read from disk (G3 implementation)
- which CI system is targeted (caller responsibility)
- rollout sequencing or operator procedures (G3-3)

---

## 1. Enablement axes

The diff workflow supports three progressive enablement axes.  Each axis is
additive — enabling a higher axis implicitly enables all lower ones.

| Axis | Definition | Activates |
|---|---|---|
| `local-only` | Diff runs locally (CLI, dev workflow) | Core diff engine, CLI render |
| `ci-only` | Diff runs in CI (automated, no PR posting) | JSON artifact output, check-run gate signal |
| `pr-enabled` | Diff posts results to PR surfaces | PR comment, PR summary export, evidence links |

Default axis: `local-only`.

The axis is set via the `diffWorkflow.enablementAxis` configuration key.

---

## 2. Strict mode vs advisory mode

Two operating modes control whether the diff result gates the CI pipeline:

| Mode | Behavior |
|---|---|
| `strict` | A `fail` gate signal exits the process with a non-zero code; blocks CI merge |
| `advisory` | Gate signal is reported but never exits non-zero; informational only |

Default mode: `advisory`.

The mode is set via the `diffWorkflow.mode` configuration key.

**Mode interaction with gate signal:**

| Gate signal | strict mode | advisory mode |
|---|---|---|
| `pass` | Exit 0 | Exit 0 |
| `warn` | Exit 0 | Exit 0 |
| `fail` | Exit non-zero | Exit 0 |

In both modes, the full `DiffCheckRunResult` is always emitted.  Mode only
controls the process exit code.

---

## 3. Feature gate model

Feature gates are boolean flags that enable specific workflow capabilities
independently of the enablement axis.  They allow partial rollout within an
axis.

### 3.1 Defined feature gates

| Gate key | Default | Description |
|---|---|---|
| `diffWorkflow.features.artifactOutput` | `false` | Write JSON artifact to disk (E2-2) |
| `diffWorkflow.features.summaryOutput` | `false` | Assemble and attach narrative summary (D2-x) |
| `diffWorkflow.features.diagnosticsOutput` | `false` | Attach diagnostics extension (C3-2) |
| `diffWorkflow.features.prComment` | `false` | Post diff comment to PR (requires pr-enabled axis) |
| `diffWorkflow.features.checkRunGate` | `false` | Emit check-run gate signal (requires ci-only axis) |
| `diffWorkflow.features.extensionHooks` | `false` | Enable D2-2 extension hook evaluation |

### 3.2 Axis prerequisite enforcement

Gates with axis prerequisites are silently disabled when the required axis is
not active:

- `prComment` requires `pr-enabled` axis; disabled if axis is `local-only` or `ci-only`.
- `checkRunGate` requires `ci-only` or `pr-enabled` axis; disabled if axis is `local-only`.

No error is emitted when a gate is disabled by axis constraint — the feature is
silently skipped.

### 3.3 Gate boundary rules

Gates protect downstream consumers and extension hooks from unexpected
activation.  The following boundary rules apply:

1. **No gate may cause a DiffCompareResult leak** — gates may enable or disable
   surface output, but they must not expose internal types to external consumers.
2. **extensionHooks gate controls D2-2 hook evaluation only** — other rule layer
   processing (D2-1, D2-3) is always active when `summaryOutput` is enabled.
3. **Disabling a gate never changes the diff result** — gates affect output only,
   not the core diff computation.
4. **Gates are evaluated at pipeline entry** — a gate value must not change
   during a single diff run.

---

## 4. Configuration key map

All configuration lives under the `diffWorkflow` namespace:

```
diffWorkflow.enablementAxis     "local-only" | "ci-only" | "pr-enabled"
diffWorkflow.mode               "strict" | "advisory"
diffWorkflow.features.artifactOutput      boolean
diffWorkflow.features.summaryOutput       boolean
diffWorkflow.features.diagnosticsOutput   boolean
diffWorkflow.features.prComment           boolean
diffWorkflow.features.checkRunGate        boolean
diffWorkflow.features.extensionHooks      boolean
```

Configuration is read from a project-level config file (path TBD by G3
implementation) and may be overridden by environment variables or CLI flags.
CLI flag overrides take precedence over file config.

---

## 5. Interaction with G1-1 mode contract

The G1-1 compare command supports two modes: `review-oriented` and
`machine-readable`.  The relationship to feature gates:

| G1-1 mode | Implied gates enabled |
|---|---|
| `machine-readable` | `artifactOutput` (optional), `checkRunGate` (optional) |
| `review-oriented` | `summaryOutput`, `diagnosticsOutput` (optional), `prComment` (optional) |

G1-1 modes are a convenience overlay; they do not override explicit gate config.
If `diffWorkflow.features.summaryOutput` is explicitly set to `false`, enabling
`review-oriented` mode does not re-enable it.

---

## 6. What this document does NOT define

- How the config file is parsed or where it lives on disk (G3 implementation)
- Environment variable naming conventions (G3 implementation)
- Rollout sequencing or gate promotion criteria (G3-3)
- How extension hooks are discovered or registered (D2-2 hook contract)
