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

## 参照

- `tests/setup.js`
- `AGENTS.md`（開発コマンド・テストの前提）
- `tests/README.md`（テスト種別と **simulated** の意味）
