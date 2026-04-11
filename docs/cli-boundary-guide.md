# CLI Boundary Guide

This guide defines the supported boundary for `npx textui` and related CLI workflows.

## What The CLI Owns

- file-based authoring and export workflows
- provider-oriented generation and capture entrypoints
- machine-readable validation and analysis output
- automation use without requiring VS Code

## Common Commands

```bash
npm run cli
npx textui providers --json
npx textui import openapi --input openapi.yaml --all --output-dir generated/from-openapi
npx textui export --file sample/01-basic/sample.tui.yml --provider html --output generated/index.html
npx textui capture --file sample/01-basic/sample.tui.yml --output generated/preview.png
```

## Theme-Related Usage

- `export` supports theme selection through `--theme`
- `capture` also supports theme selection through `--theme`

## Navigation Flow Surface

Navigation-specific CLI behavior is intentionally kept in the flow lane rather than mixed into generic page or export commands.

Current flow commands:

```bash
npx textui flow validate --file sample/13-enterprise-flow/app.tui.flow.yml --json
npx textui flow analyze --file sample/13-enterprise-flow/app.tui.flow.yml --json
npx textui flow route --file sample/13-enterprise-flow/app.tui.flow.yml --to-screen-id approval --json
npx textui flow route --file sample/13-enterprise-flow/app.tui.flow.yml --to-terminal-kind success --json
```

Use the flow lane when the task depends on:

- route search from `entry`
- terminal-aware targeting
- loop-policy-aware validation
- graph-aware analysis output

Stay on the generic CLI surface when the task is still about page DSL import/export rather than `.tui.flow.yml` semantics.

## Related Documents

- preview update pipeline: `docs/preview-update-pipeline.md`
- theme implementation: `docs/THEME_IMPLEMENTATION.md`
- maintainer workflow: `docs/MAINTAINER_GUIDE.md`
- user-facing CLI guide: [docs/cli-user-guide.md](cli-user-guide.md)

## Boundary Checkpoints

- CLI options that promise `--json` should keep returning stable machine-readable structures
- generated provider behavior and validation behavior should remain aligned with `docs/api-compat-policy.md`
- sample and regression expectations should stay reviewable through `docs/MANUAL_REGRESSION_TEST.md`

## Navigation Boundary Rules

- The CLI should consume the shared navigation contract, not invent a CLI-only flow shape.
- `flow validate`, `flow analyze`, and `flow route` should agree on screen identity, terminal metadata, and transition identity semantics.
- When a flow needs graph-aware behavior, docs should point users to Navigation v2 guidance instead of implying the Phase 1 baseline is enough.

For authoring semantics, see [Navigation v2 Guide](./navigation-v2-guide.md) and [Navigation v2 Migration Guide](./navigation-v2-migration.md).
