# package.json governance

This page is the operating map for `package.json` areas that are not covered by `package-contributes/`.

## Scope

- `contributes`: edit `package-contributes/*.json`, then run `npm run sync:package-contributes`.
- `scripts`: keep public entrypoints small; treat helper scripts as implementation details.
- `files`: VSIX/package inclusion boundary.
- `dependencies`: runtime dependencies used after install.
- `devDependencies`: local build, test, lint, and packaging tools.
- `overrides`: security and compatibility pins.

## Public Entrypoints

Use these commands in onboarding, PM assignments, and review notes unless a narrower check is required.

| Entrypoint | Audience | Purpose |
|---|---|---|
| `npm run compile` | developer, CI | TypeScript compile plus generated schema checks. |
| `npm run build-webview` | developer, release | Rebuild committed WebView assets under `media/`. |
| `npm run lint` | developer, CI | ESLint gate with zero warnings. |
| `npm test` | developer, CI | Unit lane after `pretest:ci`. |
| `npm run test:all` | developer | Unit, integration, e2e, and regression checks without coverage gates. |
| `npm run test:all:ci` | CI, release | CI-equivalent full lane with coverage and import graph checks. |
| `npm run package:vsix` | release | Build a local VSIX package. |
| `npm run sync:package-contributes` | manifest maintainer | Merge contributes fragments into `package.json`. |
| `npm run inspect:contributes` | reviewer | Summarize merged contributes without opening the large block. |
| `npm run check:undeclared-requires` | reviewer, CI | Ensure runtime `require()` calls are declared. |

## Script Inventory

Classification rules:

- **public**: normal human-facing entrypoint.
- **ci**: intended for CI/release gates, or safe for reviewers to cite directly.
- **internal**: helper, generated-source check, alias, or focused diagnostic.

| Script | Class | Exposure | Notes |
|---|---|---|---|
| `vscode:prepublish` | release | ci | VS Code publish hook; do not change semantics casually. |
| `compile` | quality | public | Primary compile and schema generation gate. |
| `build` | dev | internal | Plain TypeScript build without schema generation. |
| `watch` | dev | internal | TypeScript watch mode. |
| `package` | release | internal | Webpack extension bundle. |
| `package:vsix` | release | public | Full local VSIX packaging lane. |
| `build-webview` | release | public | WebView asset build. |
| `dev-webview` | dev | public | Vite development server with generated CSS. |
| `validate:samples` | quality | internal | Validate samples using current build state. |
| `validate:samples:navigation` | quality | internal | Compile plus sample validation. |
| `validate:samples:fresh` | quality | internal | Compile plus sample validation alias. |
| `validate:samples:compiled` | quality | internal | Alias for compiled sample validation. |
| `check:schema-generation` | quality | internal | Generated schema chain check. |
| `metrics:collect` | diagnostics | internal | Collect code metrics. |
| `metrics:check:ssot` | quality | ci | SSoT regression metrics gate. |
| `check:dsl-types-ssot` | quality | ci | DSL type import guard. |
| `check:html-exporter-fallback-lane` | quality | ci | HTML fallback lane contract guard. |
| `check:webview-media-drift` | quality | ci | Rebuild and compare `media/`. |
| `check:import-graph` | quality | ci | Import boundary graph gate. |
| `check:undeclared-requires` | quality | public | Runtime dependency declaration guard. |
| `check:ssot:non-renderer` | quality | internal | Focused SSoT unit guard. |
| `check:ssot:exporters` | quality | internal | Focused exporter SSoT guard bundle. |
| `react-ssot-check` | quality | internal | React preview/export parity guards. |
| `report:react-fallback-usage` | diagnostics | internal | React fallback usage report. |
| `plan:pr` | diagnostics | internal | PR planning diff helper. |
| `sync:configuration` | manifest | public | Generate configuration contributes fragment and merge. |
| `check:configuration` | manifest | ci | Verify generated configuration contributes. |
| `sync:commands` | manifest | public | Generate commands/menus fragments and merge. |
| `check:commands` | manifest | ci | Verify command catalog alignment. |
| `check:contributes` | manifest | ci | Verify contributes integrity. |
| `sync:package-contributes` | manifest | public | Merge contributes fragments only. |
| `inspect:contributes` | manifest | public | Logical contributes summary. |
| `inspect:contributes:markdown` | manifest | internal | Markdown summary alias. |
| `diff:contributes:fragments` | manifest | public | Fragment-level diff summary. |
| `diff:contributes:fragments:markdown` | manifest | internal | Markdown diff alias. |
| `contributes:pr-summary` | manifest | public | PR-ready contributes summary. |
| `docs:package-contributes` | manifest | internal | Regenerate fragment responsibility docs. |
| `compile-tests` | test | internal | Alias for compile. |
| `watch-tests` | dev | internal | Test-oriented TypeScript watch. |
| `pretest` | test | ci | npm lifecycle hook for `npm test`. |
| `typecheck:strict` | quality | ci | `tsc --noEmit` strict typecheck. |
| `typecheck:strict:warn` | diagnostics | internal | Non-failing strict typecheck. |
| `pretest:ci` | test | ci | Compile, strict typecheck, lint, and fallback lane guard. |
| `pretest:local` | test | internal | Compile-only local pretest shortcut. |
| `lint` | quality | public | Primary lint gate. |
| `format:check` | quality | internal | Alias for lint. |
| `test` | test | public | Unit tests. |
| `vscode-test` | test | internal | VS Code smoke entry. |
| `test:coverage` | test | internal | Unit tests with c8 coverage output. |
| `test:regression` | test | ci | Regression test lane. |
| `test:unit` | test | public | Unit lane without lifecycle hook. |
| `test:mcp` | test | internal | Focused MCP unit lane. |
| `test:integration` | test | ci | Simulated integration lane. |
| `test:e2e` | test | ci | Simulated e2e lane. |
| `test:vscode-smoke` | test | internal | VS Code smoke runner. |
| `test:quick` | test | public | Compile plus unit tests. |
| `test:all` | test | public | Broad local verification lane. |
| `test:all:ci:base` | test | ci | Full CI base without coverage wrapper. |
| `test:navigation-coverage:gate` | quality | ci | Navigation coverage gate. |
| `test:all:ci` | test | public | CI-equivalent full gate. |
| `test:cli-coverage:gate` | quality | ci | CLI coverage gate. |
| `cli` | dev | public | Run compiled CLI. |
| `mcp:serve` | dev | public | Run compiled MCP server. |
| `prepare` | dev | internal | Local prepare hook. |
| `precli` | dev | internal | npm lifecycle hook for `npm run cli`. |
| `generate:diff-traceability` | diagnostics | internal | Diff traceability generator. |
| `test:diff-coverage-guard` | quality | ci | Diff coverage guard. |
| `diff:smoke:local` | diagnostics | internal | Local diff smoke axis. |
| `diff:smoke:ci` | diagnostics | ci | CI diff smoke axis. |
| `diff:smoke:pr` | diagnostics | ci | PR diff smoke dry run. |
| `diff:matrix:delta` | diagnostics | internal | Diff matrix delta helper. |

## Entry Reduction Guidance

Keep the current command semantics stable. For Wave 2, prefer documentation and reviewer guidance over script deletion.

Low-risk follow-up candidates:

- Fold onboarding docs toward the public entrypoints table above.
- Treat `compile-tests`, `format:check`, `validate:samples:fresh`, and `validate:samples:compiled` as compatibility aliases unless a future PM ticket proves active use.
- Keep `inspect:*:markdown` and `diff:*:markdown` as internal helpers; cite `contributes:pr-summary` for PR prose.
- Keep focused `check:*` and `test:*` lanes available for Developer/Reviewer handoffs, but avoid presenting all of them as daily commands.

Do not remove or rename scripts in the same ticket that changes CI, release, or package publishing behavior.

## Package Fields

| Field | Responsibility | Review Check |
|---|---|---|
| `files` | Declares VSIX/package payload. Runtime files needed by compiled extension, MCP, schemas, media, snippets, and docs must be included here. | Packaging PRs should explain why each new runtime path is included or omitted. |
| `dependencies` | Runtime install dependencies. Anything required by compiled `out/**`, CLI, or MCP at runtime belongs here. | Run `npm run check:undeclared-requires` for new runtime `require()` usage. |
| `devDependencies` | Build, lint, test, type, and packaging tools. | Keep runtime imports out of this group unless they are type-only or test-only. |
| `overrides` | Security or compatibility pins. | Each new pin needs a short rationale in the PR or a linked security ticket. |

Current notable dependency policy:

- `chokidar` is a direct runtime dependency because `textui validate --watch` requires file watching at runtime.
- `@types/*`, `typescript`, `eslint`, `mocha`, `vite`, `webpack`, and similar tools stay in `devDependencies`.
- `autoprefixer`, `postcss`, `tailwindcss` は `npm run build-webview`（Vite + PostCSS/Tailwind）でのみ使用し、拡張の実行時（`out/**` / CLI / MCP）では `require()` しないため `devDependencies` に置く。
- 上記CSSビルド系は成果物 `media/**` に変換済みで同梱されるため、`files` に `node_modules/autoprefixer|postcss|tailwindcss` を追加しない。
- Do not rely on transitive runtime dependencies for source `require()` calls.

## Verification

For package governance changes, use the narrowest check that covers the touched field:

- Scripts/docs only: `npm run compile`
- Runtime dependency declarations: `npm run check:undeclared-requires`
- Contributes fragments: `npm run check:contributes`
- WebView package/media changes: `npm run build-webview` and `npm run check:webview-media-drift`
- Release packaging changes: `npm run package:vsix`
