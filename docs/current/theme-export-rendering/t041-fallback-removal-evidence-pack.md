# T-041: fallback 削除判定用 Evidence パック（A1 / C1）

**目的**: [t021-fallback-removal-criteria.md](./t021-fallback-removal-criteria.md) の **Evidence required** において、**A1（構造）** と **C1（運用）** を削除 PR 判断時に埋めやすくする。  
**正本**: 本ファイル。`t038`（C3〜C5・env 一覧）と併せて読む。

---

## A1 — `report:react-fallback-usage`（production fallback entries = 0）

### 実行

リポジトリルートで:

```bash
npm run report:react-fallback-usage
```

### 期待する要約行（削除判断のゲート）

- **`runtime fallback entries: 0`** — 本番経路から明示 fallback が消えていることの指標（[t021](./t021-fallback-removal-criteria.md) §A1）。

### 記録テンプレ（削除 PR または `t021` 更新時に貼る）

| 日付 (UTC) | コミット / ブランチ | `runtime fallback entries` | 実行者 |
|------------|---------------------|------------------------------|--------|
| （例）2026-04-20 | `main` @ `<hash>` | 0 | （名前） |

### 参考スナップショット（開発環境・2026-04-20 時点）

以下は **記録例**であり、**削除判断は常に最新の自分の実行結果**を正とする。

```
runtime fallback entries: 0
fallback helper definitions: 1
primary-default routes: 2
fallback execution test files: 2
fallback governance files: 4
```

---

## C1 — CI の連続グリーン（fallback 関連ジョブ）

### 方針（t021 の提案）

- **main** で **直近 N 回**（初期提案 **N = 10**）の CI がすべて成功していること、または **直近 14 日間**の scheduled / merge queue のうち厳しい方で **失敗 0**。

### 記録テンプレ

| 期間 | 対象ワークフロー | 緑の回数 / 判定 | 根拠 URL |
|------|------------------|-----------------|----------|
| （例）merge から 10 回 | `.github/workflows/ci.yml`（`test` + `test-all-ci` 等） | 10/10 | `https://github.com/<org>/<repo>/actions?query=branch%3Amain` |

### GitHub での集め方（例）

1. Actions タブ → フィルタ `branch: main`。
2. 対象 workflow（例: **CI Pipeline**）を開き、**直近 10 実行**がすべて成功か確認。
3. 一覧ページの URL を **Evidence** に貼る（またはスクショを添付）。

---

## 他セクションとの役割分担

| t021 節 | 主な正本 |
|---------|----------|
| A2〜A5 | 既存テスト名・`t017`・route-viability |
| B1〜B5 | 本リポジトリ `t021` 契約表 |
| C2 | `report:react-fallback-usage` をリリース前チェックに含める旨（運用ドキュメント） |
| C3〜C5 | [t038-fallback-removal-pr-gate.md](./t038-fallback-removal-pr-gate.md) |

---

## メンテナンス

- **スクリプト出力形式が変わったら**、本ファイルの「期待する要約行」と「参考スナップショット」を更新する。
- **SSoT セレクタ数**など別メトリクスは [t028](./t028-fallback-compatibility-css-reduction-matrix.md) を正とする。
