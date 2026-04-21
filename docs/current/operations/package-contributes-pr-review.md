# `package-contributes` を中心とした PR レビュー（T-20260421-033）

## 一次情報にする差分

1. **断片の意味の変化**（機能変更の意図があるか）  
   - `npm run diff:contributes:fragments` または `npm run diff:contributes:fragments:markdown`  
   - レビューでは **`package-contributes/*.json` の差分**を主に見る。

2. **生成物の更新**（機械的な追随）  
   - `npm run sync:package-contributes` 後の `package.json` / 生成ドキュメントの差分は、原則 **生成更新** として区別する。

## 参考コマンド

| 用途 | コマンド |
|------|----------|
| 断片の差分（テキスト） | `npm run diff:contributes:fragments` |
| 断片の差分（Markdown） | `npm run diff:contributes:fragments:markdown` |
| 断片の結合・`package.json` 反映 | `npm run sync:package-contributes` |
| contributes ドキュメント生成 | `node ./scripts/generate-package-contributes-docs.cjs`（`package.json` scripts 参照） |

## PR での記載例

- 「contributes 機能変更: `package-contributes/xxx.json` のみ手編集。`package.json` は `sync:package-contributes` 由来。」
