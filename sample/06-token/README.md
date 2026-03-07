# 06-token

`token` 属性を使って、DSLコンポーネントにテーマトークンを適用するサンプルです。

## ファイル

- `token-demo.tui.yml`: token利用コンポーネントのDSL
- `textui-theme.yml`: token定義（参照チェーンを含む）

## 使い方

1. `sample/06-token/textui-theme.yml` をプロジェクトルートへ `textui-theme.yml` としてコピー
2. `sample/06-token/token-demo.tui.yml` を開いてプレビュー
3. CLIでも確認可能

```bash
npx textui export --file sample/06-token/token-demo.tui.yml --provider html --output generated/token-demo.html --deterministic
npx textui export --file sample/06-token/token-demo.tui.yml --provider vue --output generated/TokenDemo.vue --deterministic
npx textui export --file sample/06-token/token-demo.tui.yml --provider svelte --output generated/TokenDemo.svelte --deterministic
```

## 検証ポイント

- `token` で指定したトークンが解決される
- 参照チェーン（例: `color.ctaBg -> color.brandPrimary`）が解決される
- 同一入力で決定論的な出力になる
