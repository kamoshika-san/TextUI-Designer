# Testing

This page is the canonical test-policy guide for TextUI Designer.

Use [README.md](../README.md) for the shortest project entry path. Use [SETUP.md](./SETUP.md) for environment bootstrap. Use this page to decide which test lane to run, when to run it, and which detailed references to open next.

## Test Lanes At A Glance

| Lane | Purpose | Primary command |
|---|---|---|
| Unit | Fast verification for pure logic and injected service behavior under the mocked `vscode` environment | `npm test` or `npm run test:unit` |
| Integration | Verify cross-service flows that still run in Node + Mocha with `tests/setup.js` | `npm run test:integration` |
| E2E (simulated) | Run user-flow scenarios in the mocked environment without a real VS Code Extension Host | `npm run test:e2e` |
| Regression | Protect representative export / preview behaviors against drift | `npm run test:regression` |
| Full CI lane | Run the CI-equivalent sequence for local confidence before PR / merge | `npm run test:all:ci` |
| React SSoT check | Focused Preview / Export parity and theme-vars contract guard | `npm run react-ssot-check` |

## When To Run Which Lane

### Default local safety check

Run this when you want the normal first-pass verification after a focused code change:

```bash
npm test
```

This runs `pretest:ci` first, so it covers:

- `npm run compile`
- `npm run typecheck:strict`
- `npm run lint`
- the unit lane

### Focused lane by change type

- Pure module or service logic changes: start with `npm test` or `npm run test:unit`
- Cross-service command / theme flow changes: add `npm run test:integration`
- Simulated user-flow or preview/export interaction changes: add `npm run test:e2e`
- Export / preview drift protection changes: add `npm run test:regression`
- React Preview / Export contract changes: add `npm run react-ssot-check`
- CI / release-gate confidence before review or merge: run `npm run test:all:ci`

## Current Command Entry Points

| Command | What it does now |
|---|---|
| `npm test` | `pretest:ci` + unit lane |
| `npm run test:unit` | Unit tests only |
| `npm run test:integration` | Integration lane only |
| `npm run test:e2e` | Simulated E2E lane only |
| `npm run test:regression` | Regression lane only |
| `npm run test:all` | `pretest:local` + unit -> integration -> e2e -> regression |
| `npm run test:all:ci` | `pretest:ci` + unit -> integration -> e2e -> regression |
| `npm run react-ssot-check` | Focused React DOM parity and theme-vars contract tests |

## Important Repo Reality

- `npm run test:e2e` is simulated E2E under `tests/setup.js`, not a real VS Code Extension Host run.
- Most automated lanes use mocked `vscode` behavior in Node + Mocha.
- Real-host smoke work is documented separately and is not part of the default automated lane.
- `tests/setup.js` is shared infrastructure; new tests should avoid expanding its global hook surface.

## Recommended Reading Order

1. This page for lane choice and command entry points
2. [test-matrix.md](./test-matrix.md) for detailed lane semantics and CI interpretation
3. [test-setup-policy.md](./test-setup-policy.md) for shared mock / setup constraints
4. [ci-quality-gate.md](./ci-quality-gate.md) for required CI and branch-protection checks
5. [real-vscode-smoke.md](./real-vscode-smoke.md) when you need real-host manual verification

## Release Candidate Path

When the goal is release-candidate confidence for the React-primary contract, run:

1. `npm run react-ssot-check`
2. `npm run test:all:ci`
3. `npm run metrics:collect`
4. `npm run metrics:check:ssot`

Use the detailed acceptance interpretation here:

- [react-primary-release-gate.md](./react-primary-release-gate.md)

## Related Documents

- [FAQ.md](./FAQ.md)
- [GLOSSARY.md](./GLOSSARY.md)
- [tests/README.md](../tests/README.md)
- [test-matrix.md](./test-matrix.md)
- [test-setup-policy.md](./test-setup-policy.md)
- [ci-quality-gate.md](./ci-quality-gate.md)
- [react-primary-release-gate.md](./react-primary-release-gate.md)
- [real-vscode-smoke.md](./real-vscode-smoke.md)
