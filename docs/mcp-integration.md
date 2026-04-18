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
             ├─ server.ts             (dispatch / tool実行 / resource実行)
             ├─ request-handlers.ts   (JSON-RPC method handlers)
             ├─ params.ts             (引数抽出・バリデーション共通関数)
             └─ registry.ts           (resources/prompts 定義 + prompt解決)
```

## 実装ポイント

- Core Engine: `src/core/textui-core-engine.ts`
  - DSL生成 (`generateUi`)
  - DSL検証 (`validateUi`)
  - エラー説明 (`explainError`)
  - スキーマ取得 (`previewSchema`)
  - コンポーネント一覧 (`listComponents`)
- MCP Server Adapter
  - `src/mcp/server.ts`
    - JSON-RPC 受信/応答 (`handleMessage`)
    - method dispatch（`createRequestHandlers` で生成されたハンドラへ委譲）
    - ツール実行（`tools/call`）
    - リソース実体の読み取り（`readResource`）
  - `src/mcp/request-handlers.ts`
    - `initialize`, `ping`, `tools/list`, `tools/call`, `resources/list`, `resources/read`, `prompts/list`, `prompts/get`
  - `src/mcp/params.ts`
    - `getObject*` 系, `requireStringParam`, `parseCliResourceUri`
  - `src/mcp/registry.ts`
    - `RESOURCE_DEFINITIONS`, `PROMPT_DEFINITIONS`, `resolvePrompt`
- 利用可能ツール
  - `generate_ui`, `validate_ui`, `explain_error`, `preview_schema`, `list_components`
  - ナビゲーション系: `generate_flow`（任意 `loopPolicy`: `allow` / `warn` / `deny`）、`validate_flow`（`NAV_004` 時にヒントを付与）、`analyze_flow` / `route_flow` / `compare_flow` など
  - `run_cli`（`validate/plan/apply/export/capture/import/state/providers/version` をMCP経由で実行、`export/apply/capture` では `--theme` 指定可）
  - `capture_preview`（`themePath` を指定可能）
- Resource / Prompt API
  - `resources/read` の `textui://cli/run?...`（`tools/call` 非対応クライアント向け互換）
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

推奨値: `textui-designer.mcp.scope = both`（workspace未信頼時でも user 側設定でMCPを有効化しやすくするため）。

## 起動

ビルド後に次でMCPサーバーを起動可能:

- `npm run mcp:serve`

通常は拡張の自動構成により、VS Code 側が `stdio` で起動する。

## テスト

- 既存の `tests/unit/mcp-server.test.js` に加えて、分離したモジュール向けテストを追加済み:
  - `tests/unit/mcp-params.test.js`
  - `tests/unit/mcp-request-handlers.test.js`

## 配布時の注意

- VSIX 作成時は `npm run compile` を必ず実行し、`out/mcp/server.js` を含める。
- 本リポジトリでは `vscode:prepublish` / `package:vsix` に `compile` を組み込み済み。
