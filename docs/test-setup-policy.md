# テストセットアップ方針（`tests/setup.js`・グローバルフック非拡大）

## 目的

- `tests/setup.js` が持つ **console 保護**、**グローバルな前提の書き換え**、**`Module.prototype.require` による `vscode` モック**は、規模が増えるほど **テスト間相互作用**の温床になりやすい。
- 新規テストでは **依存注入（constructor / ファクトリ）** を優先し、上記への **新規依存を増やさない**。

## 現状（事実）

- `vscode` は **`Module.prototype.require` をフック**してモックに差し替えている（`tests/setup.js`）。
- 一部のテストでは、一時的にフックを退避して実モジュールを読む処理がある。

## 新規テストで守ること

1. **まず** 対象コード側で **注入可能**にする（コンストラクタ引数・ファクトリ・テスト用の小さなシーム）。
2. **既存**のモック・ヘルパ（`tests/mocks/` 等）を **再利用**する。
3. `setup.js` の振る舞いを変える必要がある場合は **レビューで理由を明記**し、**他テストへの影響**を確認する。

## 新規で増やさないこと（原則）

- **`Module.prototype.require` フックの拡張パターン**を増やすこと（新しいモジュール横取りの列を増やさない）。
- **グローバルフックや共有ミュータブル状態**を、既存の枠を広げる形で追加すること。

## 全面撤去はしない

- 本ドキュメントは **即時のフック削除**を求めない（チケットスコープ外）。縮小・整理は **別チケット**で計画する。

## 第1スライス例（T-095）

- **`tests/unit/schema-manager.test.js`**: テストファイル内の **`Module.prototype.require` 上書きを撤去**し、`tests/setup.js` が提供する `require('vscode')`（`tests/mocks/vscode-mock.js`）に統一。`vscode.ExtensionContext` がモックに無いため、**コンストラクタ引数に必要な最小クラスだけ**をテスト側で `TestExtensionContext` として定義（新規フックは増やさない）。
- **次の一手**: 同様に、単体テスト内で `originalRequire` を保存しているファイルを **factory / 明示モック**へ段階的に移す。

## 第2スライス例（E6-S3-T1 / T-214）

- **`tests/unit/webview-utils.test.js`**（`src/utils/webview-utils.ts` 相当の出力を検証）: ファイル先頭の **`Module.prototype.require` フックと `global.vscode` を撤去**。`require('vscode')` は **setup 経由のモックのみ**を使用。`vscode-mock` の `MockWebviewPanel.webview` に **`cspSource` / `asWebviewUri` が無い**ため、**テストヘルパ `createTestWebviewPanel()`** で `vscode.window.createWebviewPanel` の戻りに対し **不足 API だけをローカルで補完**（グローバル require 横取りは増やさない）。

## 第3スライス例（RF2-S2-T1 / T-323）

- **`tests/mocks/diagnostic-manager-factory.js`**: `Module.prototype.require` による `vscode` 差し替えを **撤去**。**`DiagnosticManager` の `deps.diagnosticCollection` 注入**でモック診断コレクションを渡す（`tests/setup.js` の `require('vscode')` のまま実モジュールを読み込む）。
- **`tests/unit/diagnostic-manager-di.test.js`**: 同上フックを **撤去**し、setup 経由の `vscode` のみを使用。

## 参照

- `tests/setup.js`
- `AGENTS.md`（開発コマンド・テストの前提）
- `tests/README.md`（テスト種別と **simulated** の意味）
