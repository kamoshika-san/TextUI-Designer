# FAQ

This page is the canonical FAQ for recurring contributor questions in TextUI Designer.

Use [README.md](../README.md) for the main docs map. Use [SETUP.md](./SETUP.md), [TESTING.md](./TESTING.md), and [CONTRIBUTING.md](../CONTRIBUTING.md) for the full workflow. Use this page when you need a short answer to a repeated build, dependency, lint, or test-lane question.

## Build And Output

### `npm test` or a focused test says `out/extension.js` is missing

Run:

```bash
npm run compile
```

Most test lanes read compiled files from `out/`. If the repo was freshly cloned or cleaned, compile first and then rerun the test command.

Read next:

- [SETUP.md](./SETUP.md)
- [TESTING.md](./TESTING.md)
- [tests/README.md](../tests/README.md)

### Preview or install flows complain that `media/` assets are missing

Run:

```bash
npm run build-webview
```

The WebView bundle is generated into `media/`. If your change touches preview or install packaging, rebuild the WebView assets before retrying.

Read next:

- [SETUP.md](./SETUP.md)
- [LOCAL_INSTALLER.md](./LOCAL_INSTALLER.md)

### Schema or generated-file checks fail after a component or schema change

Run:

```bash
npm run compile
```

`compile` is the canonical entry point for TypeScript output plus schema-generation checks. Do not hand-edit generated schema files as the fix path.

Read next:

- [schema-pipeline-from-spec.md](./schema-pipeline-from-spec.md)
- [adding-built-in-component.md](./adding-built-in-component.md)

## Dependency And Environment

### Dependency-related failures appear after switching branches or pulling new changes

Refresh local dependencies first:

```bash
npm install
```

Then rerun the smallest relevant verification command. If the issue is packaging or local install related, verify the `.vsix` path only after dependencies and builds are current.

Read next:

- [SETUP.md](./SETUP.md)
- [LOCAL_INSTALLER.md](./LOCAL_INSTALLER.md)

### The `code` command is not available when I try the local install flow

Install the VS Code shell command into `PATH`, then retry the install flow. On Windows, the documented path is VS Code's command palette action for installing the `code` command.

Read next:

- [SETUP.md](./SETUP.md)
- [LOCAL_INSTALLER.md](./LOCAL_INSTALLER.md)

## Lint And Verification

### `npm run lint` fails on warnings I expected to ignore

This repo treats warnings as failures in the default local and CI paths. Fix the warning or narrow the change so the touched area passes cleanly; do not rely on warning-only merges.

Read next:

- [CONTRIBUTING.md](../CONTRIBUTING.md)
- [ci-quality-gate.md](./ci-quality-gate.md)

### I am not sure which verification lane to run for my change

Use the smallest lane that still proves the touched area:

- start with `npm test` for normal local safety
- add `npm run test:integration` for cross-service behavior
- add `npm run test:regression` for preview or export drift
- add `npm run react-ssot-check` for React Preview / Export contract changes
- run `npm run test:all:ci` before review when you need CI-equivalent confidence

Read next:

- [TESTING.md](./TESTING.md)
- [test-matrix.md](./test-matrix.md)
- [ci-quality-gate.md](./ci-quality-gate.md)

## Test-Lane Semantics

### `npm run test:e2e` is green. Does that mean the real VS Code host path was tested?

No. In this repository, `npm run test:e2e` is a simulated lane that runs under Node + Mocha with the shared mocked `vscode` setup. Use the real-host smoke guide when you specifically need manual VS Code host verification.

Read next:

- [TESTING.md](./TESTING.md)
- [real-vscode-smoke.md](./real-vscode-smoke.md)
- [tests/README.md](../tests/README.md)

### Where should I look when a question is broader than this FAQ?

Use the canonical lane pages rather than extending this FAQ into a second workflow guide:

- entry and docs map: [README.md](../README.md)
- workflow and PR rules: [CONTRIBUTING.md](../CONTRIBUTING.md)
- environment bootstrap: [SETUP.md](./SETUP.md)
- testing lanes: [TESTING.md](./TESTING.md)
- maintainer operations: [MAINTAINER_GUIDE.md](./MAINTAINER_GUIDE.md)
