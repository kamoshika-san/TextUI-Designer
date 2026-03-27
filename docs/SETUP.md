# Setup

This page is the canonical local setup guide for TextUI Designer.

Use [README.md](../README.md) for the shortest entry path. Use [CONTRIBUTING.md](../CONTRIBUTING.md) for branch strategy, pull request flow, and review expectations. Use this page for environment bootstrap, local verification entry points, and local extension install options.

## What You Need

- Node.js 20.x
- npm
- Git
- VS Code

If you want to install a packaged extension locally, you also need the `code` command in your `PATH`.

## Default Local Bootstrap

Run these commands from the repository root:

```bash
npm install
npm run compile
npm run build-webview
npm test
```

This gives you:

- compiled extension output in `out/`
- generated WebView assets in `media/`
- the unit lane as a first safety check

## Main Daily Commands

| Command | Use |
|---|---|
| `npm run compile` | TypeScript compile plus schema generation checks |
| `npm run build-webview` | Build the React + Vite WebView assets |
| `npm test` | Compile, lint, and run the unit lane |
| `npm run test:all:ci` | Run the CI-equivalent verification lane |
| `npm run react-ssot-check` | Focused React Preview / Export parity checks |
| `npm run check:dsl-types-ssot` | Guard against DSL type SSoT regressions |
| `npm run metrics:collect` | Collect release-gate metrics |
| `npm run metrics:check:ssot` | Enforce `renderer/types imports = 0` |
| `npm run check:import-graph` | Check representative cross-lane import boundaries |
| `npm run package:vsix` | Build a local `.vsix` package |

## Open The Project In VS Code

1. Open the repository root in VS Code.
2. Run the bootstrap commands above at least once so `out/` and `media/` exist.
3. If your change is editor-facing, use the local package/install flow below or the current maintainer flow.

## Local Package And Install Flow

If you need a locally installable extension package:

1. Run `npm run package:vsix`
2. Install the generated `textui-designer-<version>.vsix`

Detailed package and install steps stay here:

- [Local Installer](./LOCAL_INSTALLER.md)

## Settings And Runtime Guidance

Use these pages after setup depending on what you are changing:

- [Settings](./SETTINGS.md)
- [Test Matrix](./test-matrix.md)
- [CI Quality Gate](./ci-quality-gate.md)
- [Maintainer Guide](./MAINTAINER_GUIDE.md)

## OS-Specific Notes

### Windows

- Run commands in PowerShell from the repository root.
- If `code` is not available, install it from VS Code's command palette via `Shell Command: Install 'code' command in PATH`.

### macOS / Linux

- Run the same npm commands from your preferred shell.
- Ensure `code` is available in `PATH` if you use the CLI-based `.vsix` install path.

## What This Page Does Not Cover

- branch strategy or pull request rules
- archive policy for old docs
- maintainer-only recurring operations
- detailed built-in component authoring flow

Use the dedicated pages for those topics instead of expanding setup guidance here.
