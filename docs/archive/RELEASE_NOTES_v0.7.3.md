> Status: historical
> Updated: 2026-04-19
> Owner: Maintainer
> Reason: `docs/current/historical-notes` から読者主導線を切り離すため `docs/archive/` へ移設（T-20260419-022）
> Replacement: [現行ドキュメント索引](../current/README.md) 。リリース内容の要約はリポジトリルートの `CHANGELOG.md` を参照。

## v0.7.3 Release Notes (2026-04-02)

### Summary
v0.7.3 now ships Modal exporter parity across HTML, React, and Pug. The Modal contract is aligned for `open`, optional `title` / `body` / `actions`, and `action.kind` handling, and the shipped behavior is guarded by the existing automated test rails.

### Main Updates

- **Modal parity is now complete across exporters**
  - React and Pug `renderModal` now follow the same behavioral contract as HTML.
  - `open: false` omits export output, empty header/body/footer wrappers are not emitted, and omitted `kind` falls back to `secondary`.
- **Svelte and Vue exporter output is now production-ready at the minimum shipped contract**
  - Generated `.svelte` files now keep a stable `<script lang="ts">` + `<main class="textui-generated">` + `<style>` shape.
  - Generated `.vue` files now keep a stable `<template>` + `<script setup lang="ts">` + `<style scoped>` shape.
  - Both framework exporters now document reserved script-side extension points, keep primary-lane semantic hooks for representative samples, and passed the release-grade validation lane for this wave.
- **Generated output expectations are clearer**
  - Maintainers should expect generated React/Pug Modal output to differ from earlier placeholder or TODO-era output.
  - This is an intentional parity fix, not an unreviewed formatting drift.
- **Framework usage assumptions are now explicit**
  - Generated Svelte/Vue markup preserves Tailwind-oriented classes. Consuming apps should enable Tailwind when they want those classes to take effect.
  - “Production-ready” in this wave means stable generated structure, compatibility coverage, and release-gate validation, not full framework-specific reactive binding support yet.
- **Regression coverage is now locked on existing rails**
  - `sample/09-modal` is covered by focused marker-based regression checks for React and Pug in `tests/unit/modal-exporter-sample-regression.test.js`.
  - The same behavior is also covered by focused Modal parity tests for both exporters under `tests/unit/`.
  - Svelte/Vue output is covered by focused unit checks for normalized structure, extension-point notes, and primary-lane semantic compatibility, plus the broader release-grade compile / lint / test lanes.

### Operator Note

- Use `sample/09-modal/sample.tui.yml` as the quickest fixture when sanity-checking shipped Modal output.
- Remaining manual smoke is limited to interactive preview/export UX. Exporter parity semantics are covered in automation via the existing `test:unit` and `test:all:ci` lanes.
