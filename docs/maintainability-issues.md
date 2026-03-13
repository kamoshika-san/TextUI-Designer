# Maintainability 改善 Issue 分解（82 → 90+）

このドキュメントは、保守性改善提案をそのまま GitHub Issue に起票できる粒度へ分解したものです。

---

## Issue 1: TypeScript 静的チェックの段階導入

### タイトル案
`chore(ts): noImplicitReturns/noFallthroughCasesInSwitch/noUnusedParameters を段階導入する`

### 背景
- 現在 `strict: true` は有効だが、追加のバグ予防フラグは未有効。
- 低リスクで検出力を上げられるため、最初の改善対象にする。

### スコープ
- `tsconfig.json` の対象フラグ導入
- CI での段階運用（warning 期間 → fail 化）
- 既存コードで発生する警告の解消

### 実装タスク
- [x] `noImplicitReturns` を有効化し、警告箇所を修正
- [x] `noFallthroughCasesInSwitch` を有効化し、必要箇所へ明示コメントまたは分岐修正
- [x] `noUnusedParameters` を有効化し、不要引数の整理（互換性が必要な箇所は `_` 接頭辞等の規約に従う）
- [x] CI を warning モードで 1 週間運用（`vars.TS_STRICT_FAIL_MODE=false` で warning のみ運用）
- [x] warning 0 を確認後、fail モードへ移行（デフォルトは fail モード）

### 受け入れ条件（AC）
- [x] 上記 3 フラグが `tsconfig.json` で有効
- [x] CI が fail モードで安定通過
- [x] 主要フロー（preview/export/CLI/MCP）で退行なし（`npm run test:all` で unit/integration/e2e/regression を通過）

### 完了の定義（DoD）
- [x] PR に変更影響範囲とロールバック手順を記載（本PR）
- [x] 既存テストスイートが通過（`npm run test:all` 実行済み）
- [x] 関連ドキュメント更新（必要時）

### 工数見積
- 2〜4 人日


### クローズ確認メモ（Issue 1）
- CI段階運用: `TS_STRICT_FAIL_MODE=false` で warning運用、未設定/`false`以外で fail運用。
- 実施済み確認: strict typecheck / lint / `npm run test:all` 通過。

### ロールバック手順（Issue 1）
1. `tsconfig.json` の `noImplicitReturns` / `noFallthroughCasesInSwitch` / `noUnusedParameters` を `false` もしくはコメントアウトに戻す。
2. CI で緊急的に警告運用へ戻す場合は、Repository Variables の `TS_STRICT_FAIL_MODE` を `false` に設定。
3. `_` 接頭辞へ変更した引数名は機能差分がないため、そのままでも互換性に影響なし。

---

## Issue 2: 350 行超ファイルの責務分割（第1弾）

### タイトル案
`refactor(core/export/schema): 大型モジュールを責務分割して変更容易性を改善`

### 背景
- 350 行超ファイルが複数存在し、レビュー負荷・影響範囲把握コストが高い。
- 保守性スコア改善で最も効果が大きい施策。

### 優先対象（第1弾）
- `src/core/textui-core-engine.ts`
- `src/exporters/react-exporter.ts`
- `src/services/schema-manager.ts`

### 分割ルール
- I/O 層（外部依存・入出力）
- ドメイン処理（純粋ロジック）
- 表示/整形（レンダリング・フォーマット）

### 実装タスク
- [ ] `textui-core-engine` を 2〜3 モジュールへ分割
- [ ] `react-exporter` からテンプレート生成責務を抽出
- [ ] `schema-manager` からロード/検証/キャッシュ責務を分離
- [ ] 各分割で public API 互換を維持
- [ ] 影響範囲単位でユニットテストを補強

### 受け入れ条件（AC）
- [ ] 対象 3 ファイルの最大行数を実質削減（目安: 各 250 行以下）
- [ ] 分割後も既存機能互換を維持
- [ ] 回帰テスト（unit/integration/e2e/regression）通過

### 完了の定義（DoD）
- [ ] モジュール依存関係図または README 追記
- [ ] 主要ユースケースで手動確認（preview/export）
- [ ] ロールバック可能な単位でコミット分割

### 工数見積
- 6〜10 人日

---

## Issue 3: 品質ゲート運用の固定化（CI/テスト分類）

### タイトル案
`ci/test: test:all:ci 必須化と失敗分類タグ運用を導入`

### 背景
- 実行コマンドは整っているが、運用ルールの固定化で品質のぶれを抑制できる。

### スコープ
- ブランチ保護（`test:all:ci` 必須）
- 回帰テスト失敗分類タグ導入（`schema` / `exporter` / `preview` / `mcp`）
- PR テンプレートへの運用項目追加

### 実装タスク
- [ ] GitHub branch protection を設定
- [ ] 回帰テストの describe/it 名へ分類タグを付与
- [ ] テスト失敗時の一次切り分け手順を `docs/` に追記
- [ ] PR テンプレートに「影響範囲」「ロールバック方法」「テスト分類」を追加

### 受け入れ条件（AC）
- [ ] 保護ブランチで `test:all:ci` 未通過 PR はマージ不可
- [ ] 回帰テスト失敗時、分類タグで担当領域が即判別可能
- [ ] 開発者向けドキュメントに運用フローが明記

### 完了の定義（DoD）
- [ ] 新規 PR 1 本で運用手順の実地確認
- [ ] 失敗時対応時間の計測開始（メトリクス定義）

### 工数見積
- 2〜3 人日

---

## 起票順（推奨）
1. Issue 1（静的チェック）
2. Issue 3（運用固定化）
3. Issue 2（構造改善）

> 先に検出力とガードレールを上げてから大規模リファクタリングに入ると、手戻りが最小化できます。
