# RF4 parse-error cleanup notes

This note records the cleanup-only slice behind `T-20260322-334`, `T-20260322-336`, and `T-20260322-337`.

## Applied in this slice

- Centralized YAML parse-error repair hints in `src/services/webview/yaml-error-suggestions.ts`.
- Pointed both `YamlParser` and `WebViewErrorHandler` at the shared helper so fallback messaging stays aligned.
- Converted touched schema/error imports in the cleanup path to `import type` where runtime values were not required.

## Intentionally not changed

- No product behavior, schema contract, or preview/export routing changes.
- No broad rewrite of existing Japanese comments or user-facing copy outside the shared helper surface.
