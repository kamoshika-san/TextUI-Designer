# MCP Capture Packaging Notes

## Supported Route

`capture_preview` is expected to work when the MCP server is launched from a packaged TextUI Designer extension or from the local workspace build.

For the packaged extension route, the VSIX must include the runtime React renderer dependencies used by capture/export:

- `node_modules/react/**/*`
- `node_modules/react-dom/**/*`

If those runtime files are omitted from `package.json` `files`, the packaged MCP server can fail at runtime with `Cannot find module 'react'`.

## Codex Config Drift

TextUI Designer can auto-update MCP config targets, including Codex `.codex/config.toml`, through `textui-designer.mcp.autoConfigure`.

If `textui-designer.mcp.autoConfigure` is disabled, Codex can remain pinned to an older extension install path even after a newer build or VSIX is available. In that state, MCP failures may come from the stale extension package rather than from the current workspace code.

When troubleshooting `capture_preview`:

1. Verify which `out/mcp/server.js` path Codex is actually using.
2. Verify the packaged extension includes the React runtime files above.
3. Re-enable or refresh MCP configuration if Codex still points at a stale extension path.
