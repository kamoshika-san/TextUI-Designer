# MCP境界ガイド

このガイドは、MCP サーバーとしての TextUI Designer の責務を把握するための入口です。

## この境界の責務

- JSON-RPC ベースの入出力とツール実行の仲介
- MCP ツールのパラメータ検証とハンドラ分離
- CLI 実行やプレビューキャプチャー機能を MCP 経由で提供

## 最初に見るファイル

1. `src/mcp/server.ts`
   - サーバー本体、dispatch、tool/resource 実行
2. `src/mcp/request-handlers.ts`
   - `initialize`、resource/prompt ハンドラ
3. `src/mcp/params.ts`
   - パラメータ抽出と共通バリデーション
4. `src/mcp/registry.ts`
   - resource/prompt の静的 registry

## 関連ドキュメント

- MCP統合ガイド: `docs/mcp-integration.md`
- Provider契約: `docs/PROVIDER_CONTRACT.md`
- 運用安定契約: `docs/api-compat-policy.md`

## 変更時のチェックポイント

- server 層と handler 層で責務が混在していないか
- パラメータ仕様変更時に CLI と MCP の振る舞い差分が過大になっていないか
- 破壊的変更を伴う場合、移行手順と互換方針が明示されているか
