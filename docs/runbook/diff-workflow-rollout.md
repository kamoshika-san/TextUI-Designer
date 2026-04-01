# Diff Workflow Rollout Runbook

Updated: 2026-04-01
Owner: Maintainer
Related tickets: T-20260401-007, T-20260401-008, T-20260401-009

## Overview

The diff workflow is promoted through three enablement axes in sequence:

```
Stage 1: local-only  →  Stage 2: ci-only  →  Stage 3: pr-enabled
```

Each stage is additive. Promoting to a higher stage enables all capabilities of
lower stages. Rollback means reverting the config file to the previous stage's
sample and redeploying.

---

## Stage 1: local-only

### Purpose

Diff runs only in local developer workflows (CLI). No CI artifact output, no PR
posting.

### Promotion steps

1. Copy the sample config into place:
   ```
   cp config/diff-workflow.local-only.sample.json config/diff-workflow.json
   ```
2. Verify the smoke script reports no warnings:
   ```
   npm run diff:smoke:local
   ```
3. Confirm the resolved config shows `enablementAxis: "local-only"`.
4. Commit `config/diff-workflow.json` on a branch and open a PR for review.
5. After merge, confirm the diff CLI runs cleanly on a test file.

### Confirmation commands

```bash
npm run diff:smoke:local
```

Expected output (no warnings):
```
[OK] No warnings — config is consistent.
```

### Rollback

1. Restore the local-only config (if already at local-only, no action needed):
   ```
   cp config/diff-workflow.local-only.sample.json config/diff-workflow.json
   ```
2. Redeploy / merge the revert commit.

---

## Stage 2: ci-only

### Purpose

Diff runs in CI. JSON artifact output and check-run gate signal are available.
PR comment posting is not enabled.

### Promotion steps

1. Copy the sample config into place:
   ```
   cp config/diff-workflow.ci-only.sample.json config/diff-workflow.json
   ```
2. Verify the smoke script reports no warnings:
   ```
   npm run diff:smoke:ci
   ```
3. Confirm the resolved config shows:
   - `enablementAxis: "ci-only"`
   - `features.checkRunGate: true`
   - `features.prComment: false`
4. Commit `config/diff-workflow.json` on a branch and open a PR.
5. After merge, trigger CI on a test PR and verify:
   - The diff artifact JSON is written to the expected output path.
   - The check-run gate signal is posted to the CI run.

### Confirmation commands

```bash
npm run diff:smoke:ci
```

Expected output (no warnings):
```
[OK] No warnings — config is consistent.
```

### Rollback

1. Revert to Stage 1 config:
   ```
   cp config/diff-workflow.local-only.sample.json config/diff-workflow.json
   ```
2. Commit the revert and merge via PR.
3. Confirm CI no longer emits a check-run gate signal.

---

## Stage 3: pr-enabled

### Purpose

Full diff workflow. PR comment posting is enabled in addition to CI artifact
output and check-run gate signal.

### Promotion steps

1. Copy the sample config into place (use `--dry-run` to preview first):
   ```
   npm run diff:smoke:pr
   ```
2. Review the printed output — confirm no unexpected warnings.
3. Copy the config:
   ```
   cp config/diff-workflow.pr-enabled.sample.json config/diff-workflow.json
   ```
4. Confirm the resolved config shows:
   - `enablementAxis: "pr-enabled"`
   - `features.checkRunGate: true`
   - `features.prComment: true`
5. Commit `config/diff-workflow.json` on a branch and open a PR.
6. After merge, trigger CI on a test PR and verify:
   - The diff PR comment is posted to the test PR.
   - The check-run gate signal is correct.
   - The diff artifact JSON is present.

### Confirmation commands

```bash
npm run diff:smoke:pr
```

Expected output (no warnings, `[dry-run]` note at end):
```
[OK] No warnings — config is consistent.
[dry-run] File writes skipped. Output printed above.
```

### Rollback

**To Stage 2 (ci-only):**
1. Revert config:
   ```
   cp config/diff-workflow.ci-only.sample.json config/diff-workflow.json
   ```
2. Commit the revert and merge via PR.
3. Confirm PR comments are no longer posted on subsequent CI runs.

**To Stage 1 (local-only):**
1. Revert config:
   ```
   cp config/diff-workflow.local-only.sample.json config/diff-workflow.json
   ```
2. Commit the revert and merge via PR.
3. Confirm neither PR comments nor check-run gate signals appear in CI.

---

## ENV variable overrides (emergency)

To override the axis or mode without changing the config file, set ENV variables
before running the diff command:

| Variable                            | Effect                              |
|-------------------------------------|-------------------------------------|
| `TEXTUI_DIFF_AXIS=local-only`       | Force local-only axis               |
| `TEXTUI_DIFF_AXIS=ci-only`          | Force ci-only axis                  |
| `TEXTUI_DIFF_AXIS=pr-enabled`       | Force pr-enabled axis               |
| `TEXTUI_DIFF_MODE=advisory`         | Force advisory mode (non-blocking)  |
| `TEXTUI_DIFF_MODE=strict`           | Force strict mode (blocking on fail)|
| `TEXTUI_DIFF_FEATURE_PR_COMMENT=false`     | Disable PR comment feature   |
| `TEXTUI_DIFF_FEATURE_CHECK_RUN_GATE=false` | Disable check-run gate       |

ENV overrides take effect immediately without a config file change or deploy.
CLI flags passed to the script take precedence over ENV, which takes precedence
over the config file.

---

## Validation after any stage change

After any promotion or rollback, run the smoke command for the new target stage
and confirm:

1. No warnings in the output.
2. `enablementAxis` matches the intended stage.
3. Feature flags match the sample config for that stage.
4. For stages 2 and 3: trigger a CI run and inspect the check-run gate result.
5. For stage 3 only: verify the PR comment appears on the test PR.
