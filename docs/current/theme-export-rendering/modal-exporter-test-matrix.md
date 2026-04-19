# Modal Exporter Test Matrix

This matrix fixes the coverage viewpoints for Modal exporter parity work after [modal-export-parity-spec.md](./modal-export-parity-spec.md).

## Coverage Lanes

- `unit`: exporter-focused checks for structure, escaping, and default behavior
- `sample regression`: sample-backed markers or hashes, centered on `sample/09-modal`
- `ci-only smoke`: lightweight confirmation that the intended suite wiring is active on the existing CI lane

## Shared Viewpoints

| Viewpoint | What must be true | Primary lane | Notes |
|-----------|-------------------|--------------|-------|
| happy path | open Modal with title, body, and actions renders expected structure | sample regression | `sample/09-modal` already covers this shape |
| `open: false` | no Modal output is emitted | unit | sample includes `open: false`, but absence assertions are safer in focused exporter tests |
| no actions | no footer/actions wrapper is emitted | unit | requires a narrower fixture than the current sample |
| default `action.kind` | omitted `kind` behaves as `secondary` | unit | not covered by the current sample; keep explicit |
| multi-action variants | authored order and distinct `primary` / `secondary` / `danger` / `ghost` lanes are preserved | sample regression + unit | sample provides real variants; unit tests should pin the default and branch details |
| escaping / unsafe text | title, body, and labels are escaped rather than injected raw | unit | exporter-specific assertions are easiest here |
| multilingual labels | non-ASCII labels survive exporter output without structural drift | sample regression | current sample already exercises multilingual content |

## Exporter-Specific Observations

### React

| Observation | Primary lane | Why |
|-------------|--------------|-----|
| JSX/static-markup structure matches the shared Modal sections | unit | catches wrapper drift before sample regression noise |
| default `action.kind` resolves to the same semantic lane as HTML | unit | React implementation will introduce its own class/style mapping |
| React output still exposes sample markers needed for regression | sample regression | keeps parity tied to the existing sample lane |

### Pug

| Observation | Primary lane | Why |
|-------------|--------------|-----|
| indentation / nested section structure still reflects header, body, and footer boundaries | unit | syntax differences are Pug-specific but semantics must stay shared |
| default `action.kind` resolves to the same semantic lane as HTML | unit | Pug will have its own output formatting but not its own defaults |
| Pug output still exposes sample markers needed for regression | sample regression | ensures syntax-level changes do not hide the same user-visible content |

## Current Sample Reuse

`sample/09-modal` already gives reusable regression coverage for:

- open visible Modal output
- `secondary`, `danger`, `ghost`, and `primary` action kinds
- multilingual labels/content
- `open: false` authored input

`sample/09-modal` does not yet directly prove:

- omitted `actions`
- omitted `action.kind`
- empty or missing `title`
- empty or missing `body`
- escaping of unsafe authored text

Those should start in exporter-focused unit tests before any sample expansion is considered.

## Recommended Follow-Through

- `M-103` and `M-104` should each add focused unit coverage for:
  - `open: false`
  - omitted `actions`
  - omitted `action.kind`
  - escaping
- `M-106` should extend `sample/09-modal` regression to React and Pug using marker-first assertions, with hashes only where marker coverage is too weak.
- CI-only smoke should stay limited to confirming that the new tests are included in the existing `test:all:ci` path rather than defining new Modal-only infrastructure.
