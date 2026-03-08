# v0.5.0 リリースチェックリスト

最終更新: 2026-03-08

## 1. バージョン・ドキュメント

- [x] `package.json` の version が `0.5.0`
- [x] `package-lock.json` の version が `0.5.0`
- [x] `CHANGELOG.md` に `0.5.0` セクションを追加
- [x] `docs/RELEASE_NOTES_v0.5.0.md` を整備
- [x] `README.md` からリリースノートへの導線を配置

## 2. 実装ハイライト（v0.4.0 以降）

- [x] `Accordion` / `Tabs` / `Table` 対応
- [x] `Container` / `Table` の `width` 対応
- [x] CLI `import openapi` と `--all` 対応
- [x] CLI `apply --dir` 対応
- [x] Vue / Svelte プロバイダー追加
- [x] MCP 同梱 + 自動設定
- [x] VSIX 依存同梱（`yaml` / `ajv`）
- [x] `sample/06-token` 追加

## 3. リリース前コマンド（推奨）

```bash
npm run compile
npm run lint
npm run test:all
npm run package:vsix
```

## 4. 公開時メモ

- Marketplace 説明文は README の「できること」と整合させる
- リリースノート本文は `docs/RELEASE_NOTES_v0.5.0.md` をベースに転記する
- 既知のドキュメント移動（`doc/` → `docs/`）に伴うリンク切れがないか最終確認する
