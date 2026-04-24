# Marketplace Asset Backlog

## Goal

Track screenshot assets needed to make the VS Code Marketplace listing visually complete without adding placeholder images to the public README.

## Required Assets

| Asset | Purpose | Suggested source |
|---|---|---|
| YAML to Preview | Show the core authoring loop | `sample/01-basic/sample.tui.yml` rendered in Preview |
| Flow Preview | Show multi-screen navigation | `sample/12-navigation/app.tui.flow.yml` |
| Semantic Diff | Show meaning-aware comparison | representative diff sample under `sample/11-diff-preview/` |
| Overlay Diff | Show visual comparison workflow | representative overlay diff screen |
| Export Preview | Show dry-run output before writing files | any simple `.tui.yml` with `TextUI: Export Preview (Dry Run)` |

## Acceptance

- Screenshots should show the real extension UI, not mockups.
- Image order should match the README flow: YAML authoring -> Preview -> Flow -> Diff -> Export.
- Captures should avoid local-only paths, private project names, and noisy editor state.
