# CIテンプレート（DSL Validate + Plan）

## 目的

PRで変更された `*.tui.yml` / `*.tui.yaml` に対して、次を自動実行します。

1. `textui validate`（品質ゲート）
2. `textui plan`（差分可視化）
3. GitHub Step Summary と PRコメントへの結果掲示

## 標準ワークフロー

このリポジトリでは `.github/workflows/ci.yml` の `dsl-plan` ジョブがテンプレート実装です。

- validate失敗時: ジョブ失敗（exit code 2）
- 実行時エラー: ジョブ失敗（exit code 1）
- 変更なし/変更あり: いずれも成功（差分はSummary/コメントで可視化）

## 必要権限

`dsl-plan` ジョブには以下を付与します。

- `contents: read`
- `pull-requests: write`（PRコメント自動更新に必要）

## 実運用チェックリスト

1. Branch protection で `Test All CI` を必須チェックに設定する（最優先）。
2. 可能なら `DSL Plan (PR)` も必須チェックに設定する。
3. PRコメントに `TextUI DSL Plan（自動更新）` が1件だけ維持されることを確認する。
4. validate失敗ケースでジョブが失敗することを確認する。

## Branch Protection 設定手順（main）

1. GitHub の `Settings` -> `Branches` -> `Branch protection rules` を開く
2. `main` に対する rule を作成または編集する
3. `Require status checks to pass before merging` を有効化する
4. Required checks に以下を追加する
   - `Test All CI`（必須）
   - `DSL Plan (PR)`（推奨）
5. 保存後、検証PRで「失敗時はマージ不可」「成功時はマージ可能」を確認する

## 緊急時の例外運用（最小）

- 例外運用は、リポジトリ管理者が一時的に required check を解除して実施する。
- 解除時は、対象PRに理由・影響範囲・復旧期限を必ず記録する。
- 解除後は最短で required check を再有効化し、再発防止の対応方針を残す。

## カスタマイズポイント

- `scripts/plan-pr-diff.cjs`
  - 対象ファイル条件
  - summaryフォーマット
  - validate/planの失敗判定
- `.github/workflows/ci.yml`
  - Nodeバージョン
  - コメント更新戦略（botコメントの更新条件）
