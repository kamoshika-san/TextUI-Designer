# 実 VS Code スモーク（最小フロー）

## 目的

- **Mocha の `test:e2e`（`tests/e2e/`）は実 Extension Host ではない**（`tests/setup.js` による `vscode` モック上の simulated シナリオ）。詳細は [`tests/README.md`](../tests/README.md) を参照。
- 本書は **実際の VS Code 上**で、拡張の **活性化 → プレビュー → HTML エクスポート** が一通り動くことを確認する **最小スモーク手順**である。
- リリース前の網羅確認は [`MANUAL_REGRESSION_TEST.md`](./MANUAL_REGRESSION_TEST.md) 等を正とする。本書は **時間を短くしたスモーク**に特化する。

## 前提

| 項目 | 内容 |
|------|------|
| VS Code | `package.json` の `engines.vscode` に整合する版 |
| 拡張 | 本リポジトリを **Extension Development Host で起動**（`F5` / 「拡張機能の開発」）するか、マーケットプレイス／`.vsix` インストール済みのもの |
| サンプル | リポジトリ同梱の `sample/` 配下の `.tui.yml`（例: `sample/01-basic/sample.tui.yml`）をワークスペースで開けること |

## スモーク手順（3 ステップ）

### 1. 活性化（Activation）

1. VS Code で本リポジトリ（またはサンプルを含むフォルダ）を **フォルダとして開く**。
2. エクスプローラーで **`*.tui.yml` を開く**（例: `sample/01-basic/sample.tui.yml`）。
3. **期待**: YAML として開き、言語モードが YAML。拡張は **`onLanguage:yaml`** およびコマンド実行時に遅延活性化される。問題なければ **コマンドパレット**（`Ctrl+Shift+P` / macOS は `Cmd+Shift+P`）に **`TextUI:`** で始まるコマンドが列挙される。

> **メモ**: 活性化の厳密な条件は [`package.json`](../package.json) の `activationEvents` を正とする。

### 2. プレビューを開く（Open Preview）

1. **アクティブエディタ**で上記 `.tui.yml` を開いた状態にする。
2. コマンドパレットで **`TextUI: Open Preview`**（command: `textui-designer.openPreview`）を実行する。  
   - またはエディタタイトルバーのアイコンから同一コマンド（YAML 編集中のみ表示）。
3. **期待**: プレビュー用 WebView が開き、致命的なエラーで止まらない。

### 3. HTML エクスポート（Export）

1. 引き続き同じ `.tui.yml` を対象に、コマンドパレットで **`TextUI: Export to Code`**（command: `textui-designer.export`）を実行する。  
   - またはエディタタイトルバーから実行。
2. 保存先と形式を聞かれた場合は **HTML** を選び、一時フォルダなどに保存する。
3. **期待**: 保存が完了し、生成 HTML をブラウザで開いて **空でない・明らかに壊れていない**ことが確認できる（詳細な見た目は回帰テストの範囲）。

## 合否の目安（チーム合意用）

| # | チェック |
|---|----------|
| A | 手順 1〜3 を **中断なく**実行できる |
| B | プレビューが **表示される**（真っ白のまま固まらない等、明らかな失敗がない） |
| C | HTML エクスポートが **保存まで完了**する |

## 自動化の位置づけ（足場）

- **現状の CI デフォルト**は `npm test` / `npm run test:all` の **モックベース**ライン。実機スモークは **本手順の手動実行**で補う。
- 将来 **Extension Host 上の自動化**を足す場合は、`@vscode/test-electron` 等の別ラインとして追加する想定（[`tests/README.md`](../tests/README.md) の「実 VS Code 上での検証」節）。本チケットでは **手順の文書化とチーム合意可能な合否基準**までをスコープとする。

## 自動化レーン

- narrow real-host smoke は `npm run test:vscode-smoke` を正とする。
- CI では Linux headless host 上で `xvfb-run -a npm run test:vscode-smoke` を実行する。
- Windows ローカルでは `@vscode/test-electron` の引数解釈差異で不安定な場合があるため、手元再現は WSL / Linux 環境を推奨する。
- 目的は exhaustive UI automation ではなく、実 Extension Host での activation と preview open が壊れていないことの確認に留める。

## 関連ドキュメント

- [`MANUAL_REGRESSION_TEST.md`](./MANUAL_REGRESSION_TEST.md) — プレビュー起点エクスポートの手動回帰
- [`tests/README.md`](../tests/README.md) — テスト種別と simulated e2e の説明
- [`AGENTS.md`](../AGENTS.md) — 開発コマンド一覧
