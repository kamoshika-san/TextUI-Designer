# TextUI Designer MCP 同梱ガイド

## 目的

TextUI Designer を VS Code 拡張として使うだけで、生成AIエージェントからも同じ機能を呼び出せるようにする。

## 構成

```text
[ Core Engine ]
      │
      ├─ VS Code Extension Adapter
      │      └─ 既存のコマンド/プレビュー/設定
      │
      └─ MCP Server Adapter
             └─ tools / resources / prompts
```

## 実装ポイント

- Core Engine: `src/core/textui-core-engine.ts`
  - DSL生成 (`generateUi`)
  - DSL検証 (`validateUi`)
  - エラー説明 (`explainError`)
  - スキーマ取得 (`previewSchema`)
  - コンポーネント一覧 (`listComponents`)
- MCP Server Adapter: `src/mcp/server.ts`
  - `generate_ui`, `validate_ui`, `explain_error`, `preview_schema`, `list_components`
  - `run_cli`（`validate/plan/apply/export/import/state/providers/version` をMCP経由で実行）
  - `resources/list`, `resources/read`, `prompts/list`, `prompts/get`
- VS Code Extension Adapter: `src/services/mcp-bootstrap-service.ts`
  - 拡張起動時に `mcp.json` と Codex 用 `config.toml` を自動更新
  - `textui-designer.mcp.*` 設定で挙動を制御
  - 起動コマンド既定値は `node`（必要時のみ上書き）

## 設定

`package.json` で以下を追加:

- `textui-designer.mcp.autoConfigure`
- `textui-designer.mcp.scope` (`workspace` / `user` / `both`)
- `textui-designer.mcp.serverId`
- `textui-designer.mcp.command`
- `textui-designer.mcp.notifyOnConfigured`

## 起動

ビルド後に次でMCPサーバーを起動可能:

- `npm run mcp:serve`

通常は拡張の自動構成により、VS Code 側が `stdio` で起動する。

## 配布時の注意

- VSIX 作成時は `npm run compile` を必ず実行し、`out/mcp/server.js` を含める。
- 本リポジトリでは `vscode:prepublish` / `package:vsix` に `compile` を組み込み済み。
