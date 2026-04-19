---
governance: generated
generated_at: 2026-04-19T09:13:10Z
---

# package-contributes フラグメント責務（T-011）

このファイルの **表と「生成メタ」節**は `npm run docs:package-contributes` で上書きされます。説明文の正本は各 `package-contributes/*.json` と本リポジトリの方針ドキュメントです。

## 運用の要点

- **`package.json` の `contributes` を直接編集しない**（マージ結果の閲覧は `npm run inspect:contributes`）。
- フラグメントを編集したら **`npm run sync:package-contributes`**（必要に応じて先に `sync:commands` / `sync:configuration`）。
- 変更の俯瞰: **`npm run diff:contributes:fragments`**（`--base=main` 可）。

## フラグメント一覧（責務）

| ファイル | マージ先 `contributes` キー | 責務 |
|---|---|---|
| `configuration.json` | `configuration` | 拡張機能の **設定 UI**（`contributes.configuration`）。キーは `textui-designer.*`。既定値・説明文の正本。多くは `npm run sync:configuration` で生成。 |
| `commands.json` | `commands` | **コマンドパレット**用の `Command[]`（`contributes.commands`）。`npm run sync:commands` でマニフェストと同期。 |
| `menus.json` | `menus` | `contributes.menus`（エディタタイトルバー・コンテキスト等）。通常は **commands と同時生成**（sync:commands）。 |
| `languages-snippets.json` | `languages`<br>`snippets` | `contributes.languages` と `contributes.snippets`。YAML/JSON 言語登録とスニペット JSON への参照。 |
| `schemas.json` | `yaml.schemas`<br>`jsonValidation` | `contributes["yaml.schemas"]` と `contributes.jsonValidation`。DSL・テーマ・テンプレートの JSON Schema 割当。 |

## 生成メタ（自動）

- **generated_at**: 2026-04-19T09:13:10Z

| フラグメント | サイズ(bytes) | トップレベルキー数 / 配列長 |
|---|---:|---:|
| `configuration.json` | 7631 | 2 |
| `commands.json` | 2498 | 24 |
| `menus.json` | 1462 | 2 |
| `languages-snippets.json` | 325 | 2 |
| `schemas.json` | 602 | 2 |

## 関連

- [package-contributes 方針](./package-contributes-policy.md)
- リポジトリ README の「Package `contributes`」節
