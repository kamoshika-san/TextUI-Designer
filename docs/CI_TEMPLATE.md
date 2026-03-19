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

1. Branch protectionで `DSL Plan (PR)` を必須チェックに設定する。
2. PRコメントに `TextUI DSL Plan（自動更新）` が1件だけ維持されることを確認する。
3. validate失敗ケースでジョブが失敗することを確認する。

## カスタマイズポイント

- `scripts/plan-pr-diff.cjs`
  - 対象ファイル条件
  - summaryフォーマット
  - validate/planの失敗判定
- `.github/workflows/ci.yml`
  - Nodeバージョン
  - コメント更新戦略（botコメントの更新条件）
