# Theme Token Vocabulary

**Purpose**: record the canonical theme token vocabulary for the React SSoT unification work.

## Canonical Rule

- Internal theme token storage uses `theme.tokens.colors` as the canonical container.
- Legacy `theme.tokens.color` is accepted only as an input compatibility alias.
- DSL token references may still use `color.*` at the input boundary, but the resolver normalizes them before internal lookup.

## Compatibility Notes

- CSS variable builders emit both `--colors-*` and legacy `--color-*` names from the canonical `colors` tree.
- Preview ThemeManager and Export share the same default-merge and variable-map builder contract before CSS is emitted.
- New internal code should read and merge `colors`, not `color`.
- If a future cleanup removes the legacy alias, it must be handled as an explicit compatibility change.

## T-20260327-059 Scope

- Normalize preview/export/theme-loader/token-resolver handling onto one internal vocabulary.
- Keep existing theme files and token references working while the compatibility lane is still needed.
