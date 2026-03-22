# テストマトリクス（層定義・実施順・CI との対応）

## 目的

- **unit / integration / smoke（実ホスト）** の層を言語化し、**どのコマンドがどの層に相当するか**を一本化する。
- [`ci-quality-gate.md`](./ci-quality-gate.md) の **CI 品質ゲート**（`npm run test:all:ci` 等）と **矛盾しない**表現にする。

## 層の定義（Epic6 E6-S2-T2）

| 層 | 定義 | 本リポジトリでの意味 |
|----|------|----------------------|
| **Unit** | **pure / injected**（副作用を注入または純粋ロジック） | `tests/unit/**/*.js` を **`tests/setup.js`** 経由で実行。`vscode` API は **テスト用にモック**され、**実 Extension Host は不要**。 |
| **Integration** | **mocked vscode**（モックした VS Code 上で複数モジュールを結合） | 現状の **`tests/integration/`**（例: `command-manager.test.js`）。同様く **モック環境**（実ホストではない）。 |
| **E2E（simulated）** | スクリプト名は `e2e` だが **実機ではない** | **`tests/e2e/`** は Mocha + モックによる **結合に近いシナリオ**。詳細は [`tests/README.md`](../tests/README.md)。 |
| **Regression** | 回帰スイート（プレビュー起点エクスポート等） | **`tests/regression/`** — 引き続きモック環境。 |
| **Smoke（real host）** | **実 VS Code** 上での最小確認 | **自動化のデフォルト品質ゲートには含めない**。手動手順は [`real-vscode-smoke.md`](./real-vscode-smoke.md)。 |

> **用語注意**: `package.json` の **`test:e2e`** は歴史的名称であり、**実 Extension Host の E2E ではない**。「実ホストでの smoke」は別ラインとして扱う。

## npm スクリプトと層の対応

| スクリプト | 層（上表） | 備考 |
|------------|------------|------|
| `npm test` / `npm run test:unit` | **Unit** 一式 | `pretest` により `compile` + `typecheck:strict` + `lint` の後に unit のみ（`npm test` は `tests/unit/**/*.js`）。 |
| `npm run test:integration` | **Integration** | CommandManager 等の統合。 |
| `npm run test:e2e` | **E2E（simulated）** | 実ホストではない。 |
| `npm run test:regression` | **Regression** | 回帰シナリオ。 |
| `npm run test:all` | 上記を **順に**（ローカル） | `pretest:local`（compile のみ）後、unit → integration → e2e → regression。 |
| `npm run test:all:ci` | CI 相当の一括 | `pretest:ci`（compile + typecheck + lint）後、**同じ順**で unit → integration → e2e → regression。 |

**手動 Smoke** に相当する npm スクリプトは **ない**（意図的）。必要時のみ [`real-vscode-smoke.md`](./real-vscode-smoke.md) を実行する。

## 推奨実施順（ローカル）

フィードバックの速さと **`test:all` / `test:all:ci` と同じ順序**を揃える。

1. **ビルド・静的解析** — CI では `pretest:ci`、手早く回すときは `pretest:local` または `npm run compile` のみ。
2. **Unit** — `npm run test:unit`（または `npm test`）。
3. **Integration** — `npm run test:integration`。
4. **E2E（simulated）** — `npm run test:e2e`。
5. **Regression** — `npm run test:regression`。
6. **（任意・リリース前など）Smoke（real host）** — [`real-vscode-smoke.md`](./real-vscode-smoke.md)。

一発で揃える場合は **`npm run test:all`**（ローカル）または **`npm run test:all:ci`**（CI 相当の厳しさ）。

## CI との整合

- **PR / main の「緑」**の定義は [`ci-quality-gate.md`](./ci-quality-gate.md) に従い、少なくとも **`npm run test:all:ci` が成功**することを正とする。
- 上記は **Unit + Integration + E2E（simulated）+ Regression** までを含み、**実 VS Code smoke は含まない**（コスト・再現性のため）。

## 関連ドキュメント

- [`tests/README.md`](../tests/README.md) — テスト種別・simulated e2e の説明
- [`real-vscode-smoke.md`](./real-vscode-smoke.md) — 実ホスト最小スモーク
- [`ci-quality-gate.md`](./ci-quality-gate.md) — CI ジョブと npm の対応
- [`AGENTS.md`](../AGENTS.md) — 開発コマンド一覧
