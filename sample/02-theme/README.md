# 02-theme：テーマの使い方

テーマファイル（`textui-theme.yml`）でデザインを統一するサンプルです。

## ファイル

| ファイル | 説明 |
|----------|------|
| `theme-demo.tui.yml` | テーマ適用後のコンポーネント表示を確認するデモ用ページ |
| `textui-theme.yml` | サンプルテーマ（Modern Blue Theme）。カラー・スペーシング・タイポグラフィなどを定義しています。 |

## 使い方

1. **テーマを有効にする**: このフォルダの `textui-theme.yml` を**プロジェクトルート**（ワークスペースのルート）にコピーし、同じ名前 `textui-theme.yml` で保存する  
   - 拡張はルートの `textui-theme.yml` を参照します
2. `theme-demo.tui.yml` を開いてプレビューを表示
3. ルートの `textui-theme.yml` を編集すると、プレビューにリアルタイムで反映されます
4. プレビュー上の「デフォルト▼」からテーマを切り替えることもできます

## カスタマイズのヒント

- `tokens.color.primary` … メインカラー
- `tokens.spacing.md` … 標準余白
- `tokens.typography.fontFamily.primary` … フォント

詳細は [sample/README.md](../README.md) のテーマセクションを参照してください。
