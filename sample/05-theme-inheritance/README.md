# 05-theme-inheritance：テーマ継承（extends）サンプル

`extends` を使った**チェーン継承**（base → corporate → product）を確認するためのサンプルです。

## ファイル

| ファイル | 説明 |
|---|---|
| `base-theme.yml` | ルートの基底テーマ |
| `corporate-theme.yml` | `base-theme.yml` を継承した中間テーマ |
| `textui-theme.yml` | `corporate-theme.yml` を継承した最終テーマ |
| `inheritance-demo.tui.yml` | 継承済みテーマでUIを確認するデモ画面 |

## 使い方

1. このフォルダの 3 つのテーマファイル（`base-theme.yml` / `corporate-theme.yml` / `textui-theme.yml`）を、**相対配置を保ったまま**ワークスペース直下にコピーします。
2. ワークスペース直下の `textui-theme.yml` が最終テーマとして読み込まれます。
3. `inheritance-demo.tui.yml` を開いてプレビューし、ボタン色・角丸・テキスト色を確認します。

## 何が継承されるか

- `textui-theme.yml` では `colors.primary` と `colors.text.secondary`、`button.primary.backgroundColor` のみ上書き
- `corporate-theme.yml` では `colors.primary` と `button.primary.borderRadius` を上書き
- それ以外は `base-theme.yml` の値が引き継がれます
