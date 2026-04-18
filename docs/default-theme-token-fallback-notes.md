# Default Theme Token Fallback

Capture, export, and CLI token validation now follow the same fallback order as preview token vocabulary lookup.

1. Explicitly selected theme file
2. Nearest `textui-theme.yml` or `textui-theme.yaml`
3. Built-in preview default theme tokens

Notes:
- Explicit theme selection still wins over local fallback behavior.
- Missing theme files no longer fail token resolution when the requested token exists in the built-in default theme.
- Unknown token names still remain validation or resolution errors.
