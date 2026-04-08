# CLI User Guide

Use the TextUI CLI when you want to validate a DSL file, preview the changes it would make, write output artifacts, or capture a screenshot without opening VS Code.

## Start Here

1. Validate the DSL file.
2. Plan the changes against the current state.
3. Apply the changes when the plan looks right.
4. Capture a preview image when you need a shareable screenshot.

## Validate A File

Check one file before you do anything else:

```bash
npx textui validate --file sample/01-basic/sample.tui.yml
```

Check a directory recursively and return machine-readable output:

```bash
npx textui validate --dir sample --json
```

Use `validate` when you want schema issues, include issues, or token issues before export or capture.

## Plan Changes

Compare the current DSL against the saved CLI state:

```bash
npx textui plan --file sample/01-basic/sample.tui.yml --state .textui/state.json
```

Write the plan as JSON when you need it in automation:

```bash
npx textui plan --file sample/01-basic/sample.tui.yml --state .textui/state.json --json
```

If no state file exists yet, the plan is effectively telling you what the first apply would create.

## Apply Changes

Apply a validated file and write the generated artifact:

```bash
npx textui apply --file sample/01-basic/sample.tui.yml --state .textui/state.json --auto-approve --output generated/textui.html
```

Choose a different provider when needed:

```bash
npx textui apply --file sample/01-basic/sample.tui.yml --provider react --state .textui/state.json --auto-approve --output generated/textui.jsx
```

`apply` requires `--auto-approve` in non-interactive use. The state file defaults to `.textui/state.json`.

## Capture A Preview

Capture a PNG without opening the extension UI:

```bash
npx textui capture --file sample/01-basic/sample.tui.yml --output generated/preview.png
```

Apply a theme during capture:

```bash
npx textui capture --file sample/01-basic/sample.tui.yml --output generated/preview.png --theme sample/theme/theme.yml
```

Use `capture` when you want a visual artifact for review, docs, or CI evidence.

## Common Options

- `--file <path>`: target one DSL file
- `--dir <path>`: target a directory for commands that support batch mode
- `--json`: emit machine-readable output
- `--provider <name>`: choose `html`, `react`, `pug`, `svelte`, or `vue`
- `--provider-module <path>`: add an external provider module
- `--theme <path>`: load theme tokens for export or capture

List the currently available providers:

```bash
npx textui providers --json
```

## Workflow Summary

```bash
npx textui validate --file <dsl>
npx textui plan --file <dsl> --state .textui/state.json
npx textui apply --file <dsl> --state .textui/state.json --auto-approve --output <artifact>
npx textui capture --file <dsl> --output <preview.png>
```

If you need implementation boundaries or maintainer-oriented notes after onboarding, continue with `docs/cli-boundary-guide.md`.
