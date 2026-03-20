## 概要

<!-- 1〜3行で「何を・なぜ」を書いてください -->

例: `schema-manager` のキャッシュ責務を別モジュールに切り出し、変更時の影響範囲を局所化する。

---

## 変更の種類（該当するものにチェック）

- [ ] バグ修正
- [ ] 機能追加
- [ ] リファクタ（挙動不変）
- [ ] ドキュメントのみ
- [ ] CI / ビルドのみ
- [ ] その他:

---

## 影響範囲（必須）

<!-- 主に触れたレイヤを列挙。該当なしは「なし」と明記 -->

例:

- `extension`（VS Code 拡張本体）
- `CLI`（`out/cli` / `npm run cli`）
- `MCP`（`src/mcp/*`）
- `WebView` / `media`
- `schema`（定義・生成・検証）
- `exporter`（HTML/React/Pug 等）
- `CI`（`.github/workflows`）

実際の記入:

-

---

## テスト分類タグ（必須）

<!-- 失敗時の一次切り分け用。該当するものにチェック。複数可 -->

- [ ] `schema`
- [ ] `exporter`
- [ ] `preview`（WebView / プレビュー関連）
- [ ] `mcp`
- [ ] 該当なし（ドキュメントのみ・CIメタのみ等）— 理由を1行で:

---

## ロールバック方法（必須）

<!-- マージ後に問題が出たときの最短手順 -->

例:

1. 本PRを `git revert <merge-commit>` する
2. または `main` 上で該当コミットまで戻す（チーム運用に従う）
3. 設定・生成物を戻す場合は `npm run sync:configuration` / `check:*` の手順を明記

実際の記入:

-

---

## 検証

<!-- 実施したものにチェック。未実施は理由を併記 -->

- [ ] `npm run compile`
- [ ] `npm run check:configuration`（設定変更時）
- [ ] `npm run check:commands`（コマンド定義変更時）
- [ ] `npm run check:contributes`（`contributes` 配下変更時）
- [ ] `npm run test:unit`
- [ ] `npm run test:all` または CI の `Test All CI` が緑
- [ ] （DSL 変更時）`DSL Plan (PR)` の結果を確認

補足（任意）:

-

---

## 関連ドキュメント

- メンテナー向け実務: [`docs/MAINTAINER_GUIDE.md`](docs/MAINTAINER_GUIDE.md)
- CI / DSL Plan: [`docs/CI_TEMPLATE.md`](docs/CI_TEMPLATE.md)
