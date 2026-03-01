# 04-include-cyclic：循環参照の検証

`$include` で A → B → A のように循環参照したときに、パーサがエラーを出すことを確認するサンプルです。

## ファイル

| ファイル | 説明 |
|----------|------|
| `cycle-test.tui.yml` | **メイン**。`a.template.yml` を include します。 |
| `a.template.yml` | ここから `b.template.yml` を include |
| `b.template.yml` | ここから `a.template.yml` を include（循環） |

## 使い方

1. `cycle-test.tui.yml` を開いてプレビューを表示
2. **期待される動作**: 「循環参照を検出しました」のような `YamlParseError` が表示される
3. 実際の開発では、テンプレートの参照関係が A→B→A にならないように注意してください

## ポイント

- パーサは include の連鎖をたどり、同じファイルが再度参照された時点で循環参照として検出します。
- エラーメッセージに参照の経路（ファイルパスの並び）が含まれます。
