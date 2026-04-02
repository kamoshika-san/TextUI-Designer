## v0.7.3 Release Notes (2026-04-02)

### Summary
v0.7.3 now ships Modal exporter parity across HTML, React, and Pug. The Modal contract is aligned for `open`, optional `title` / `body` / `actions`, and `action.kind` handling, and the shipped behavior is guarded by the existing automated test rails.

### Main Updates

- **Modal parity is now complete across exporters**
  - React and Pug `renderModal` now follow the same behavioral contract as HTML.
  - `open: false` omits export output, empty header/body/footer wrappers are not emitted, and omitted `kind` falls back to `secondary`.
- **Generated output expectations are clearer**
  - Maintainers should expect generated React/Pug Modal output to differ from earlier placeholder or TODO-era output.
  - This is an intentional parity fix, not an unreviewed formatting drift.
- **Regression coverage is now locked on existing rails**
  - `sample/09-modal` is covered by focused marker-based regression checks for React and Pug in `tests/unit/modal-exporter-sample-regression.test.js`.
  - The same behavior is also covered by focused Modal parity tests for both exporters under `tests/unit/`.

### Operator Note

- Use `sample/09-modal/sample.tui.yml` as the quickest fixture when sanity-checking shipped Modal output.
- Remaining manual smoke is limited to interactive preview/export UX. Exporter parity semantics are covered in automation via the existing `test:unit` and `test:all:ci` lanes.
