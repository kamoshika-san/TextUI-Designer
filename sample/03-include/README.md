# 03-include：テンプレート分割（$include）

YAML を複数ファイルに分割し、`$include` で参照するサンプルです（PR #104 の機能）。

## ファイル

| ファイル | 説明 |
|----------|------|
| `include-sample.tui.yml` | **メイン**。ここを開いてプレビューを表示します。 |
| `header.template.yml` | 見出し＋説明文のテンプレート。`{{ $params.title }}` でパラメータを受け取ります。 |
| `form-section.template.yml` | セクション見出し＋ネストした `$include`（`fields.template.yml` を参照）。 |
| `fields.template.yml` | 入力フィールド＋送信ボタンのテンプレート。`{{ $params.submitLabel }}` でボタンラベルを差し替え。 |

## 使い方

1. `include-sample.tui.yml` を開く
2. プレビューを開くと、`$include` が解決され、テンプレートの内容が展開されて表示されます
3. `include-sample.tui.yml` の `params` を変更すると、テンプレート内の `{{ $params.xxx }}` が置き換わります

## ポイント

- **$include** は `page.components` の配列要素として記述し、`template` に `.template.yml` の相対パス、必要なら `params` を渡します。
- テンプレート側では **`{{ $params.名前 }}`** でパラメータを参照できます。
- テンプレートからさらに別テンプレートを `$include` する**ネスト**も可能です。
