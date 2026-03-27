# CI 品質ゲートと branch protection（運用メモ）

本ドキュメントは、`package.json` のスクリプトと `.github/workflows/ci.yml` を照合し、**PR でどのチェックを必須にするか**と **GitHub での branch protection 設定手順**をリポジトリ内から辿れるようにする（実際の設定変更はリポジトリ管理者の権限が必要）。

## 1. npm スクリプト（ローカル／CI 共通の定義）

| スクリプト | 内容（要約） |
|-----------|----------------|
| `pretest:ci` | `compile` → `typecheck:strict` → `lint`（PR 前の品質前提） |
| `test:all:ci` | `pretest:ci` の後に `test:unit` → `test:integration` → `test:e2e` → `test:regression` を順に実行 |
| `test:all` | `pretest:local`（compile のみ）＋上記テスト群。ローカル向け。CI 相当の厳しさは **`test:all:ci`** |

**「緑の main」の技術的な定義（提案）**: **`npm run test:all:ci` が成功**し、かつ **`Code metrics` job で `threshold=0` / `status=PASS`** を満たすこと。  
（`pretest:ci` はその一部として含まれる。）

## 2. GitHub Actions との対応（`.github/workflows/ci.yml`）

主要ジョブ名（**Branch protection で選ぶ「チェック名」は通常ここに一致**）:

| ワークフロー上の表示名 | 役割 |
|------------------------|------|
| **Test All CI** | `npm run test:all:ci` を実行。上記「緑」と直結するゲート。 |
| **Test Suite** | Node 18.x / 20.x のマトリクス。`pretest:ci`、`validate:samples:compiled`、`test:unit`、`test:coverage` など。 |
| **Lint & Format Check** | ESLint と `format:check`。 |
| **Build Extension** | `needs` で **Test All CI / Test Suite / Lint** の成功後に compile・package。 |
| **Integration Tests** | `needs` で Test All CI / Test Suite の成功後に統合テスト。 |
| **DSL Plan (PR)** | PR 専用（差分サマリ）。必須ゲートにするかはチーム方針次第。 |
| **Code metrics** | `npm run metrics:collect` → `npm run metrics:check:ssot`。**SSoT release gate** として `renderer/types imports = 0` を確認。 |

**PR 必須チェックの提案（最小）**

1. **必須（推奨）**: **`Test All CI`**  
   - `test:all:ci` 相当で、unit / integration / e2e / regression を一括で担保する。
2. **必須（SSoT 運用）**: **`Code metrics`**  
   - `renderer/types imports` を **閾値 0 固定**で判定する release gate。artifact と Job Summary もここで確認する。
3. **任意（より厳格）**: **`Lint & Format Check`**、`**Build Extension**`、マトリクス **`Test Suite`**（18.x / 20.x の両方）など。  
   - マトリクスジョブは、GitHub の UI に表示されるチェック名（例: `Test Suite (20.x)`）で個別に指定する場合がある。

> **注意**: 初回 PR またはワークフロー変更後は、一覧にチェックが現れてから branch protection で名前を選ぶと確実。

## 3. GitHub branch protection 設定チェックリスト（管理者向け）

対象ブランチ例: `main`（運用に合わせて `master` 等に読み替え）。

- [ ] **Settings** → **Branches** → **Branch protection rules** → **Add branch protection rule**（または既存ルールを編集）
- [ ] **Branch name pattern** に `main`（など保護対象）を入力
- [ ] **Require a pull request before merging** を有効化（運用に合わせる）
- [ ] **Require status checks to pass before merging** を有効化
- [ ] **Require branches to be up to date before merging**（任意・チーム方針）
- [ ] **Status checks that are required** で、少なくとも **`Test All CI`** と **`Code metrics`** を追加  
  - 追加で厳格化する場合は **`Lint & Format Check`**、`**Build Extension**`、`**Test Suite**`（表示名に注意）などを選択
- [ ] **保存**し、テスト用 PR で必須チェックがブロック／通過することを確認

**ホストが GitHub 以外の場合**: 同等の「必須パイプライン／必須ジョブ」機能に、上記 npm／ジョブの対応表を写し替えて運用する。

## 4. 関連ドキュメント

- 開発コマンド一覧: リポジトリ直下 `AGENTS.md`
- 保守性スコアとフェーズ計画: `docs/maintainability-score.md`
