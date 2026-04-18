# リリースノート v0.9.2

## 概要

エディタ上のショートカット表示の短縮、MCP／CLI の信頼性向上、およびフロー生成まわりの小さな拡張をまとめたメンテナンスリリースです。

## 利用者向けの変化

### VS Code UI

- YAML / `.tui.*` エディタのタイトルバー（およびコマンドパレット）で、プレビューと透かし比較の表記が **`TUI: Preview`** / **`TUI: Diff`** に短縮されました。

### MCP

- **`generate_flow`** に任意パラメータ **`loopPolicy`**（`allow` / `warn` / `deny`）を追加。生成する `.tui.flow.yml` に Navigation v2 の `policy.loops` を含めやすくなりました。
- **`validate_flow`** で循環検出（`NAV_004`）のとき、**`flow.policy.loops: allow`** を検討するためのヒントが診断に付与されます。
- **`capture_preview`** がパッケージ済み拡張（VSIX）でも動くよう、同梱依存を整備しました。
- **Windows** でワークスペースパスとドライブ文字の大文字小文字が一致しない場合でも、ルート解決が安定するよう修正しました。

### CLI

- テーマファイルでトークンが欠けている場合でも、**プレビュー既定のテーマトークン**へフォールバックし、`textui validate` などでの不要な未知トークン警告を減らします。

## 互換性

破壊的変更はありません。既存の `.tui.yml` / `.tui.flow.yml` はそのまま利用できます。

## 参照

- [`CHANGELOG.md`](../CHANGELOG.md) の `[0.9.2]` 節
- [`docs/mcp-integration.md`](./mcp-integration.md)
