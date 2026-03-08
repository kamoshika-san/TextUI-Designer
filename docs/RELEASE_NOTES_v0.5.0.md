# TextUI Designer v0.5.0 リリースノート

リリース日: 2026-03-08

## 概要

v0.5.0 は、`v0.4.0` 以降で進んだ **DSL 表現力の拡張**、**CLI ワークフロー強化**、**MCP 同梱による導入簡素化** を中心にまとめたリリースです。  
UI コンポーネント追加と OpenAPI 連携により、設計からコード出力までの体験をより実運用向けに改善しています。

## このリリースノートの対象範囲

- 比較起点: `v0.4.0`
- 主な実装差分: `v0.4.0..e480a47`
- リリース文書整備: `7dbf805`（本ブランチのドキュメント更新）

## ハイライト

- `Accordion` / `Tabs` / `Table` を DSL・WebView・各 Exporter でサポート
- `Container` / `Table` の `width` 指定に対応
- CLI に `import openapi` と `--all`（全 operation 一括生成）を追加
- CLI の `apply --dir` で複数 DSL を一括適用可能に
- トークンスキーマ/意味検証、および export/apply 時のトークン解決を強化
- `Vue` / `Svelte` の組み込みプロバイダー追加
- MCP サーバーをコアに同梱し、mcp.json の自動設定をサポート
- VSIX に `yaml` / `ajv` ランタイム依存を同梱して配布安定性を改善
- `sample/06-token` を追加し、トークン運用のサンプルを拡充

## 変更詳細（v0.4.0 → v0.5.0）

### 1) DSL・レンダリング

- 新コンポーネント `Accordion` / `Tabs` / `Table` を追加
- スキーマ、レジストリ、WebView コンポーネント、エクスポーターの対応を同期
- `Container` / `Table` の `width` 指定でレイアウト調整の自由度を向上

### 2) CLI

- `textui import openapi` を追加し、OpenAPI から DSL を生成可能に
- `--all` オプションで API operation を一括で DSL 化
- `apply --dir` 追加により、ディレクトリ単位のバッチ適用が可能
- トークンスキーマ検証・意味検証を導入し、生成前の品質チェックを強化
- export/apply でテーマトークン解決を実施し、出力一貫性を改善

### 3) プロバイダー / 出力

- 組み込みプロバイダーに `Vue` / `Svelte` を追加
- プロバイダー契約テストを追加し、将来拡張時の回帰を抑制

### 4) MCP 統合

- MCP サーバーをコアエンジンに同梱
- 拡張起動時の MCP 設定自動構成（mcp.json）に対応
- Bundled MCP 起動の安定化対応を実施

### 5) 配布・CI・ドキュメント

- VSIX パッケージングで `yaml` / `ajv` 依存同梱を明確化
- CI に DSL validate と PR plan レポートを追加
- CLI 回帰テストを強化
- 旧 `doc/` 配下を `docs/` へ集約
- `sample/06-token`（トークン定義と適用例）を追加

## 破壊的変更

- なし

## 移行メモ

- ドキュメント参照パスが `doc/` から `docs/` に移動しています。内部リンクや運用スクリプトで旧パスを参照している場合は更新してください。
- OpenAPI 連携や provider 拡張を利用する場合は、最新の `README.md` / `docs/PROVIDER_CONTRACT.md` を参照してください。

## リリース時の確認資料

- リリース前チェックリスト: `docs/RELEASE_CHECKLIST_v0.5.0.md`
- 変更履歴（全体）: `CHANGELOG.md`

