# TextUI Review — CI 統合ガイド

TextUI Review Engine は **stdout + exit code** だけを提供します。
特定の CI プラットフォームに依存しないため、GitHub Actions / GitLab CI / Jenkins / その他どの環境でも使えます。

## 基本的な使い方

### 1. SemanticDiff を Markdown で出力する

```sh
textui review \
  --base HEAD~1 \
  --head HEAD \
  --file path/to/screen.tui.yml \
  --format markdown
```

stdout に標準 Markdown が出力されます。CI パイプラインがこれを受け取り、任意の方法でコメント投稿・保存できます。

### 2. 未決定変更を検出して CI を止める

```sh
textui review:check \
  --file path/to/screen.tui.yml \
  --fail-on-undecided
```

- 未決定変更あり → exit code 1（CI 失敗）
- 全変更が決定済み → exit code 0（CI 成功）

`--format markdown` を追加すると、未決定リストを Markdown で出力します。

---

## CI プラットフォーム別の使用例

### GitHub Actions

```yaml
- name: TextUI Review Check
  run: |
    textui review:check \
      --file src/screens/home.tui.yml \
      --fail-on-undecided \
      --format markdown >> $GITHUB_STEP_SUMMARY
```

### GitLab CI

```yaml
textui-review:
  script:
    - textui review:check --file src/screens/home.tui.yml --fail-on-undecided
  artifacts:
    reports:
      dotenv: review-result.env
```

### 任意のシェルスクリプト

```sh
OUTPUT=$(textui review --base main --head HEAD --file screen.tui.yml --format markdown)
echo "$OUTPUT"
# $OUTPUT を任意の方法で使用する
```

---

## VCS コネクタ（上級者向け）

TextUI は `VcsConnector` インターフェースを提供しています。
プラットフォーム固有の統合が必要な場合は `src/integrations/<platform>/` に実装を追加できます。

```
src/integrations/
├── vcs-connector.ts        ← インターフェース契約
├── null-connector.ts       ← デフォルト（何もしない）
└── github/
    └── github-connector.ts ← GitHub 固有実装（stub）
```

GitHub 統合を切り離す場合は `src/integrations/github/` を削除するだけです。

---

## 設計原則

- TextUI は stdout と exit code だけを提供する
- プラットフォーム固有の API 呼び出しは TextUI が担わない
- Markdown 出力は標準 Markdown のみ（プラットフォーム固有拡張記法を含まない）
