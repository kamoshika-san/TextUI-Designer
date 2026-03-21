# SSoT メトリクスと CI での見え方（1ページ）

**目的**: `npm run metrics:collect` / `npm run metrics:check:ssot` が **何を出力し、CI でどう見えるか**を、新規参加者が **この1導線**で追えるようにする。  
**関連**: [dsl-types-change-impact-audit.md](dsl-types-change-impact-audit.md)（T-158 監査観点）・[dsl-types-renderer-types-inventory.md](dsl-types-renderer-types-inventory.md)

---

## 1. コマンド一覧（`package.json` 正）

| npm script | スクリプト | 役割 |
|------------|------------|------|
| `metrics:collect` | `node ./scripts/collect-code-metrics.cjs` | リポジトリの行数集計に加え、**SSoT 回帰用**の `renderer/types` 違反ファイル一覧を **`metrics/code-metrics.json`**（および **`metrics/code-metrics.md`**）に書き出す。 |
| `metrics:check:ssot` | `node ./scripts/check-ssot-regression-metrics.cjs` | 上記 JSON の **`ssot`** ブロックを読み、**閾値 vs 検出件数**で **PASS/FAIL** を返す（exit code）。 |

**前提**: `metrics:check:ssot` は **`metrics/code-metrics.json` が存在すること**を要求する。先に `metrics:collect` を実行する。

**ローカルでの典型手順**:

```bash
npm run metrics:collect
npm run metrics:check:ssot
```

**標準出力の例**（`metrics:check:ssot`）:

```text
[ssot-metrics] threshold=0, renderer/types imports=0, status=PASS
```

- **`threshold`**: 環境変数 `SSOT_IMPORT_THRESHOLD`（既定 `0`）。許容する **違反ファイル数の上限**。
- **`renderer/types imports`**: 非 renderer から `renderer/types` へ import していると判定された **ファイル数**（`collect-code-metrics.cjs` 内 `collectSsotMetrics()` と同じ探索）。
- **`status`**: `imports <= threshold` なら `PASS`。

---

## 2. 生成物（`metrics/`）

`metrics/` は **`.gitignore` 対象**（生成物のためリポジトリにはコミットしない）。

| ファイル | 内容 |
|----------|------|
| `metrics/code-metrics.json` | `generatedAt`・行数サマリー・**`ssot`: `{ threshold, rendererTypesImports, violatingFiles, status }`** など |
| `metrics/code-metrics.md` | 人間可読の Markdown（**「SSoT 回帰メトリクス」**表・違反ファイル一覧） |

`metrics:collect` は **stdout にも** `code-metrics.md` 相当を出す（CI の Job Summary 追記用）。

---

## 3. CI での位置づけ（`.github/workflows/ci.yml`）

**ジョブ名**: `Code metrics`（`code-metrics`）

1. `npm run metrics:collect`
2. `npm run metrics:check:ssot`
3. `metrics/code-metrics.md` を **GitHub Actions の Job Summary** に追記（`$GITHUB_STEP_SUMMARY`）
4. `metrics/` を **artifact** `code-metrics` としてアップロード

PR では **Job Summary** または **Artifacts** から、当時の **閾値・検出件数・違反ファイル**を確認できる。

---

## 4. `check:dsl-types-ssot` との違い（ざっくり）

| 観点 | `npm run check:dsl-types-ssot` | `metrics:collect` の SSoT 部分 |
|------|-------------------------------|--------------------------------|
| 主目的 | **import パス規約**の棚卸し（`domain` vs `renderer/types` の一覧・スクリプト `check-dsl-type-imports.cjs`） | **回帰検知用**の JSON/Markdown 化と **閾値チェック**（`metrics:check:ssot`） |
| CI | lint / 専用チェックに依存（リポジトリ設定に従う） | **`code-metrics` ジョブ**で artifact として残る |

両方 **緑**であることが、SSoT 境界を壊していないことの **多層防御**になる。

---

## 5. PM / TM 向けチェックリスト（T-158 監査への貼り付け用）

以下は [dsl-types-change-impact-audit.md](dsl-types-change-impact-audit.md) **§3** の補足としてそのまま使える。

- [ ] **メトリクス**: `npm run metrics:collect` → `npm run metrics:check:ssot` が **PASS**（`status=PASS`、必要なら CI の Code metrics ジョブで確認）。
- [ ] **artifact**: リリース前後で **同じ閾値**（通常 0）のまま **違反ファイルが増えていない**こと（PR の Job Summary または `code-metrics` artifact）。
- [ ] **棚卸し**: `npm run check:dsl-types-ssot` が **違反 0** で、[dsl-types-renderer-types-inventory.md](dsl-types-renderer-types-inventory.md) のスナップショット節と矛盾しない。

---

## 6. トラブルシュート

| 症状 | 確認 |
|------|------|
| `metrics:check:ssot` が `metrics/code-metrics.json が見つかりません` | 先に `npm run metrics:collect` を実行したか |
| `FAIL` と違反ファイル一覧 | 該当ファイルで `renderer/types` への import をやめ、`domain/dsl-types` 等へ寄せる（[ADR 0003](adr/0003-dsl-types-canonical-source.md)） |
| 閾値を一時的に上げたい | **`非推奨`**: `SSOT_IMPORT_THRESHOLD` はチケット・レビュー合意の上でのみ。恒久対応は違反の解消 |
