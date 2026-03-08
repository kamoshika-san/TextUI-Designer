# 07-enterprise サンプル

このディレクトリは業務システム想定の複雑なUIサンプルを格納します。

目的:
- ダッシュボード（検索・フィルタ・一覧・詳細表示）
- マルチステップ承認フォーム
- 一括操作モーダル
- レポート（チャート／集計）プレースホルダ

使い方:
- `out/exporters/html-exporter.js` を使ってHTML出力を確認できます（AGENTS.md を参照）。
- スキーマ検証: `node scripts/validate-samples.cjs sample/07-enterprise/sample.tui.yml` を推奨。

注意:
- このサンプルはDSLの表現例を示すためのもので、実際のバックエンド連携は含んでいません。