## v0.6.0 リリースノート（2026-03-17）

### 概要

v0.6.0 は **プレビュー画像キャプチャ（PNG）**の追加と、**WebView / Export / キャプチャのレンダリング統一**を中心に、UI表現（コンポーネント）・CLI/MCPの自動化・サンプルを大きく拡張したリリースです。

---

### 目玉機能

- **プレビュー画像出力（PNG）**
  - VS Code: `TextUI: Capture Preview Image`
  - CLI: `npx textui capture ...`
  - MCP: `capture_preview` / `run_cli` 経由
  - **テーマ指定に対応**（CLI は `--theme`、MCP は `themePath` / `--theme`）

- **レンダリング経路の統一**
  - WebView と Export/キャプチャで見た目が揃うように改善
  - 「プレビューでは正しいがエクスポートすると崩れる」系の差分を縮小

---

### 新コンポーネント / 表現拡張

- **追加コンポーネント**
  - `Badge`
  - `Image`（avatar など）
  - `Progress`（セグメント表示対応）
  - `Icon`
  - `Link`
  - `Breadcrumb`

- **Table 強化**
  - `rowHover` の追加
  - セルを「文字列」だけでなく「コンポーネント」として表現できる拡張

- **Container 強化**
  - `flexGrow` / `minWidth` などのレイアウト指定を追加・改善

---

### サンプル

- **`sample/08-github/` を追加**
  - GitHub リポジトリ画面風の大規模サンプル
  - テンプレート分割（`*.template.yml`）の実例としても利用可能

---

### CLI / MCP

- **CLI の拡張**
  - 自動化向けに `providers` / `validate` / `plan` / `apply` / `state` / `capture` を中心に機能を拡充
  - OpenAPI import の拡張性を改善（レイヤ分割、operation選択/マッピング強化）

- **MCP の拡張**
  - `run_cli` / `capture_preview` など、エージェントから Export/キャプチャを扱いやすく改善
  - 拡張機能起動時の自動構成（`textui-designer.mcp.*`）を前提に、導線を整理

---

### 互換性・注意点（ユーザーに影響しうる変更）

- **エクスポート出力の差分**
  - WebView と合わせるため、HTML/React/Pug の **出力構造・スタイルが一部変更**されています。
  - 生成物をリポジトリにコミットしている場合は、v0.6.0 への移行時に差分レビューを推奨します。

---

### 開発・CI

- **品質ゲート強化**
  - `pretest:ci` に strict typecheck（`tsc --noEmit`）と `eslint --max-warnings 0` を含め、CIとローカルのズレを抑制

- **依存関係**
  - `puppeteer-core` の導入（キャプチャ機能）
  - `yauzl` を override（セキュリティ/互換性改善）

