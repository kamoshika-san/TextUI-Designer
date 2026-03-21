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
- [ ] `ssot`（`domain/dsl-types` と `renderer/types` 境界に影響あり）
- [ ] 該当なし（ドキュメントのみ・CIメタのみ等）— 理由を1行で:

### SSoT 影響チェック（該当時）

- [ ] 共有 DSL 型の更新起点が `src/domain/dsl-types.ts` になっている
- [ ] `src/renderer/types.ts` に型本体・独自 alias・業務ロジックを追加していない（thin facade 維持）
- [ ] `src/renderer/**` 外で `renderer/types` を新規 import していない（必要なら理由を明記）
- [ ] `npm run check:dsl-types-ssot` を実行して結果を確認（import 境界の機械検査）
- [ ] `npm test` を実行し、SSoT 関連ユニットが通過することを確認（個別実行する場合は `npx mocha --grep "renderer/types|SSoT eslint restriction scope guard" tests/unit` でも可）

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

## CI 品質ゲート（参照）

<!-- PR でどのチェックを必須にするか・`test:all:ci` の位置づけは T-043 のドキュメントに準拠 -->

- 必須チェックの選定・branch protection 手順: [`docs/ci-quality-gate.md`](docs/ci-quality-gate.md)
- ローカルで CI 相当の厳しさを再現する場合: `npm run test:all:ci`（`pretest:ci` を含む）

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
- SSoT 方針 ADR: [`docs/adr/0003-dsl-types-canonical-source.md`](docs/adr/0003-dsl-types-canonical-source.md)
- 型追加フロー: [`docs/adding-built-in-component.md`](docs/adding-built-in-component.md)
- 影響半径・完了監査: [`docs/dsl-types-change-impact-audit.md`](docs/dsl-types-change-impact-audit.md)
