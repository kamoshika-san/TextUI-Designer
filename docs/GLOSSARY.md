# Glossary

This page is the shared glossary for recurring project-specific terms used across the current TextUI Designer docs.

Use [README.md](../README.md) for the main documentation map. Use this page when a term appears in setup, workflow, testing, boundary, or maintenance docs and you want the intended current meaning in one place.

## Core Product Terms

### DSL

The YAML / JSON document format used to describe UI in TextUI Designer. In contributor docs, `DSL` usually means the source document itself plus the shared shape contracts that validate it.

### Preview

The interactive UI rendering shown in the VS Code WebView. Current docs treat Preview as the normal React-based rendering path for contributor and user-facing behavior.

### Export

The generated output path that turns DSL into HTML or other code-oriented results. In current React SSoT docs, normal export expectations are judged against the React-primary path first.

### WebView

The VS Code-hosted browser surface used for the Preview UI. In docs, `WebView` usually refers to the extension-side panel plus the React renderer running inside it.

## Documentation Structure Terms

### Canonical

The one page that should answer the main question for a topic and reader lane. Other pages may link to it, but they should not restate the same full guidance.

### Supporting

A detail page under a canonical page. Supporting docs hold matrices, examples, subsystem specifics, or deep references without replacing the main destination.

### Historical

A page kept for past context rather than default reader flow. Historical pages are not the normal source for current contributor decisions.

### Archive

The `docs/archive/` area for historical or superseded material. Archived pages must say what replaced them or why they are being kept.

### Lane

A reader-path or verification-path category used to keep docs and checks organized. Current docs use lane language for both information architecture and testing or CI flow.

## Workflow And Quality Terms

### Entry

The shortest contributor path into the docs set. Right now this starts at `README.md`.

### Development Workflow

The contributor lane covering setup, branch flow, pull requests, and daily commands. Current canonical destinations are `README.md`, `CONTRIBUTING.md`, and `docs/SETUP.md`.

### Testing / Quality Gates

The docs lane for choosing verification commands, understanding CI, and judging whether a branch is safe to merge or release.

### Green Main

The expectation that `main` stays mergeable and releasable with the required checks green. In docs, it is the branch-health concept behind CI and release-gate guidance.

### Maintainer

The reader persona responsible for recurring operational checks, quality gates, and longer-lived system health guidance rather than first-time contributor onboarding.

## Rendering And Contract Terms

### React-primary

The current default rendering model for Preview and normal Export expectations. Release and parity checks are defined against this path first.

### Fallback lane

The narrower compatibility path used when legacy fallback behavior is intentionally requested. Current docs treat it as explicit compatibility coverage, not the normal acceptance target.

### SSoT

Short for `Single Source of Truth`. In this repo it means one canonical place for a contract, definition, or metric so drift can be detected instead of tolerated.

### React SSoT check

The focused verification lane that protects Preview / Export parity and theme-vars contract alignment on the React-primary path.

### Release gate

The small set of checks that must stay green before a branch or candidate is accepted as releasable. Current React-primary guidance ties this to `react-ssot-check`, `test:all:ci`, and the SSoT metrics checks.

## Test Terms

### Unit lane

The default fast verification lane for pure logic and injected service behavior.

### Integration lane

The Node + Mocha lane that checks cross-service behavior without a real VS Code host.

### Simulated E2E

The lane run by `npm run test:e2e`. It uses the shared mocked `vscode` setup and is not the same as a real VS Code Extension Host run.

### Real-host smoke

Manual verification done against a real VS Code host when the mocked lanes are not enough.

## Specification Terms

### Spec

A current contract or design page that belongs in the `Specification / Architecture` lane. Specs are different from historical notes because they are meant to guide current decisions.

### ADR

Architecture Decision Record. ADRs document a design decision and its reasoning and live as part of the specification and architecture lane unless later superseded.

## Related Documents

- [documentation-information-architecture.md](./documentation-information-architecture.md)
- [documentation-consolidation-rules.md](./documentation-consolidation-rules.md)
- [documentation-archive-policy.md](./documentation-archive-policy.md)
- [TESTING.md](./TESTING.md)
- [ci-quality-gate.md](./ci-quality-gate.md)
