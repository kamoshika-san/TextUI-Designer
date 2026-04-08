# CLI境界ガイド

このガイドは、`npx textui` を中心とした CLI 境界の責務をまとめた入口です。

## この境界の責務

- ファイル入力（DSL / OpenAPI）と出力（HTML / React / Pug / Vue / Svelte）のバッチ実行
- 開発フローへの組み込み（CI・スクリプト）に適した非対話実行
- VS Code なしでの検証・生成パイプラインの提供

## よく使うコマンド

```bash
npm run cli
npx textui providers --json
npx textui import openapi --input openapi.yaml --all --output-dir generated/from-openapi
npx textui export --file sample/01-basic/sample.tui.yml --provider html --output generated/index.html
npx textui capture --file sample/01-basic/sample.tui.yml --output generated/preview.png
```

## テーマ適用の扱い

- `export` でテーマを適用する場合は `--theme`
- `capture` でテーマを適用する場合も `--theme`

## 関連ドキュメント

- プレビュー更新パイプライン: `docs/preview-update-pipeline.md`
- テーマ実装: `docs/THEME_IMPLEMENTATION.md`
- 保守運用ガイド: `docs/MAINTAINER_GUIDE.md`

## 変更時のチェックポイント

- CLI オプション追加時に `--json` など既存契約を壊していないか
- 出力 provider の追加/変更時に互換ポリシー（`docs/api-compat-policy.md`）を満たしているか
- サンプル/回帰手順（`docs/MANUAL_REGRESSION_TEST.md`）に必要な追記があるか
CLI の使い始めは [docs/cli-user-guide.md](cli-user-guide.md) を先に見てください。このページは境界や運用寄りの補足をまとめるためのものです。
