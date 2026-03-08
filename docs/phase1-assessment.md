# Phase 1 (Foundation) 達成状況アセスメント

最終更新: 2026-03-03

## 判定

**Phase 1 は「概ね達成（MVPレベルで達成）」**。

- CLI (`validate / plan / apply / export`) は実装済み。
- 差分表示（Plan）・終了コード（CI向け）・状態ファイル（`.textui/state.json`）・決定論チェック（`--deterministic`）が揃っている。
- ただし Terraform 互換レベルを目指すなら、State のロック・バックエンド分離・差分アルゴリズムの拡張は今後の課題。

## チェック項目

### 1. CLI 実装

- `textui <validate|plan|apply|export|state|version>` を実装済み。
- `package.json` の `bin.textui` から CLI エントリを公開。

### 2. Plan 機能（差分可視化）

- `buildPlan` で `+ / ~ / -` の差分を生成。
- `plan` 実行時は変更ありで exit code `3`、変更なしで `0`。

### 3. 冪等・決定論

- `export/apply` で `--deterministic` 指定時に 2 回出力比較を実施。
- 同一 DSL の再現性を CLI レベルで検証可能。

### 4. State 管理

- 既定 State は `.textui/state.json`。
- `apply` 後に state を生成・保存。
- `state show/push/rm` をサポート。
- `apply` 実行中に state が変化した場合は衝突として exit code `4`。

### 5. CI 統合

- 非対話実行向けに明示的な exit code を返す実装。
- `apply` は `--auto-approve` 必須で、CI 事故を抑制。

## 補足（未達ではないが、次フェーズ候補）

- State のリモートバックエンド対応（S3/GCS 等）。
- 厳密な state lock（排他制御）の導入。
- 差分粒度の高度化（ネスト構造・順序変更の扱い改善）。
