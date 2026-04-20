# T-045: fallback 削除判定 — 構造 Evidence（A2 / A4）

**目的**: [t021-fallback-removal-criteria.md](./t021-fallback-removal-criteria.md) の **§A** において、**A2（internal-only）** と **A4（互換到達がテストに閉じる）** を削除判断時に同じ形式で埋められるようにする。  
**関連**: [t017-html-export-lane-options-internal-api.md](./t017-html-export-lane-options-internal-api.md) · [t041-fallback-removal-evidence-pack.md](./t041-fallback-removal-evidence-pack.md)（A1 / C1）

---

## A2 — helper / 互換オプションが **internal-only**

### 意図

- **（T-20260420-001 完了後）** 旧 **`withExplicitFallbackHtmlExport` / `__internalLegacyFallback`** は **削除済み**。Evidence では **`src/` に復活が無い**ことを確認する。

### 推奨チェック（ローカル）

リポジトリルートで:

```bash
rg "withExplicitFallbackHtmlExport\\s*\\(" --glob "*.ts" --glob "!**/internal/**"
```

期待（**T-20260420-001 完了後 · T-091 更新**）: **`src/**/*.ts` にヒット 0**（内部ヘルパと互換ラッパは削除済み）。残るのは **ドキュメント**や **`scripts/report-react-fallback-usage.cjs`** の説明用パターン文字列のみであることを確認する。

補足: **ESLint** の `no-restricted-imports` 等で `fallback-lane-options` を `src/**` の許可リストに閉じている場合は、その設定ファイル名とルール ID を Evidence に 1 行で記載する。

### 記録テンプレ

| 日付 | `rg` 結果（要約） | ESLint 設定（該当あれば） | 判定 |
|------|-------------------|---------------------------|------|
| （例） | `src/` ヒット 0 | `eslint.config.js` §… | PASS |

---

## A4 — 互換レーン到達が **unit test（＋明示ドキュメント）に閉じる**

### 意図

- **`createFallbackOptions` / `withExplicitFallbackHtmlExport` はリポジトリから削除済み**であること（`rg "createFallbackOptions\\(" tests` → **0 件**）。HtmlExporter の境界は **`html-exporter-primary-only-structure.test.js`** と **`html-exporter-route-viability.test.js`** が正。

### 推奨チェック（ローカル）

```bash
rg "createFallbackOptions\\(" tests --glob "*.js"
```

期待: **`rg "createFallbackOptions\\(" tests` → 0 件**。旧 observability / structured-log テストは **削除済み**（T-20260420-090）。新規の `src/cli` / `src/mcp` 等への再導入が **0** であること。

### 記録テンプレ

| 日付 | ヒットファイル一覧 | 新規 `src/` 呼び出し | 判定 |
|------|---------------------|----------------------|------|
| （例） | 上記 3 + helper のみ | 0 | PASS |

---

## メンテナンス

- **grep パターン**はリポジトリのディレクトリ構成変更時に見直す。
- **A3 / A5** は `html-exporter-route-viability.test.js` のテスト名・CI ログをそのまま Evidence に貼れる。
