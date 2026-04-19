# MCP Boundary Guide

This guide defines the supported TextUI Designer boundary exposed through the MCP server.

## What The MCP Layer Owns

- JSON-RPC entrypoints for TextUI Designer capabilities
- parameter validation and handler routing
- tool-facing access to preview, CLI-adjacent, and flow analysis surfaces
- parity with the shared contracts already used by CLI and core services

## Primary Files

1. `src/mcp/server.ts`
   - server bootstrap and dispatch for tools/resources
2. `src/mcp/request-handlers.ts`
   - initialize flow and handler wiring
3. `src/mcp/params.ts`
   - parameter parsing and shared validation
4. `src/mcp/registry.ts`
   - resource and prompt registry

## Related Documents

- MCP integration guide: `docs/current/runtime-boundaries/mcp-integration.md`
- provider contract: `docs/current/services-webview/PROVIDER_CONTRACT.md`
- API compatibility policy: `docs/current/workflow-onboarding/api-compat-policy.md`

## Navigation Flow Surface

Navigation-specific MCP behavior should stay aligned with the CLI flow lane and the shared navigation DSL contract.

Current flow-oriented tools:

- `validate_flow`
- `analyze_flow`
- `route_flow`

`route_flow` must receive exactly one navigation target:

- `toScreenId`, or
- `toTerminalKind`

Use the navigation MCP lane when the caller needs:

- graph-aware validation
- analysis of adjacency, terminals, or reachability
- route search from `entry` to a screen or terminal kind

## Boundary Checkpoints

- server and handler responsibilities should remain clearly separated
- parameter validation should keep CLI and MCP semantics aligned
- externally visible behavior should remain explicit and reviewable

## Navigation Boundary Rules

- MCP handlers should not define a second navigation schema that differs from `.tui.flow.yml`.
- Parameter validation should reject ambiguous route queries rather than guessing between screen-target and terminal-target modes.
- CLI and MCP docs should describe the same graph-aware semantics for loops, terminal metadata, and stable transition identity.

For the authoring contract, pair this guide with [Navigation v2 Guide](./navigation-v2-guide.md) and [Navigation v2 Migration Guide](./navigation-v2-migration.md).
