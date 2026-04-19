# Provider Contract（CLI）

## 目的

TextUI CLI の provider を、実装者が同じ基準で追加・検証できるようにするための契約定義です。  
対象は `textui providers / export / apply` で利用する provider です。

## 契約インターフェース

provider モジュールは以下の形を満たす必要があります。

- `name: string`
- `extension: string`（例: `.html`, `.vue`）
- `version: string`（SemVer推奨）
- `render(dsl): Promise<string>`（決定論的な文字列出力）

## 必須要件

1. **決定論的出力**
   - 同じ `dsl`・同じ `version`・同じ実行条件で常に同じ出力を返すこと。
2. **拡張子整合**
   - `extension` と実際の出力ファイル拡張子が一致すること。
3. **非破壊性**
   - `render` は入力DSLを破壊的に変更しないこと。
4. **エラー品質**
   - 失敗時は原因が追跡できるエラーメッセージを返すこと。

## 互換性ポリシー

- `version` は provider 実装の互換境界です。
- 破壊的変更（出力仕様変更、属性削除など）は `major` を上げます。
- 非破壊の改善（属性追加、コメント追加など）は `minor/patch` を上げます。

## 内蔵 provider（現行）

- `html` (`.html`)
- `react` (`.tsx`)
- `pug` (`.pug`)
- `vue` (`.vue`)
- `svelte` (`.svelte`)

## 外部 provider の読み込み

CLI は `--provider-module <path>` で外部 provider を読み込めます。  
`--provider <name>` とモジュール内 `name` は一致が必須です。

例:

```js
module.exports = {
  name: 'solid',
  extension: '.solid',
  version: '0.1.0',
  async render(dsl) {
    return '<main>custom provider</main>';
  }
};
```

## 契約テスト

最低限、以下の観点を自動テストで満たしてください。

1. `providers --json` に `name/extension/version/source` が揃っている。
2. 内蔵 provider 一覧が期待集合と一致する。
3. 各 provider で `export` が成功し、出力拡張子が契約どおりである。

実装済みテスト:

- `tests/unit/provider-contract.test.js`
