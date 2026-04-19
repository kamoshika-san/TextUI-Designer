# 生成AI活用 画面設計ワークフロー ロードマップ（v2）

最終更新: 2026-04-16

## 1. 目的

TextUI Designer の「生成AIで画面設計 -> 検証 -> 出力 -> 運用」フローを、継続的に改善するための中長期計画を管理する。

## 2. このドキュメントの役割

- 本ドキュメントは **中長期の計画と優先順位** を管理する
- 日々の変更手順や正本パスは `docs/current/operations/MAINTAINER_GUIDE.md` を正本とする

## 3. 現状サマリ（2026-03-20）

### 完了済み（直近）

- Preview Capture の責務分割（`src/utils/preview-capture/*`）
- CLI エントリの遅延ロード（`src/cli/index.ts`）
- MCP `capture_preview` の DTO/mapper/adapter 分離
- CommandManager の handler 委譲化
- configuration の生成/検証フロー導入（`sync/check:configuration`）

### 未完了（継続課題）

- CI 運用品質の固定化（branch protection、分類タグ、PRテンプレ拡張）
- 大型モジュール分割（`textui-core-engine` / `react-exporter` / `schema-manager`）
- AIフロー品質改善（`generate_ui` / `explain_error` / OpenAPI import 実案件ケース）
- State/CI 運用機能の拡張（ロック方針、差分運用の定常化）

## 4. フェーズ計画（現行）

### Phase 1（0〜3ヶ月）着手方針（2026-04-16時点）

短期で最優先とするのは「初回成功率」を下げる不整合の除去です。

- README / package / コマンド / 実装の整合を維持
- ゴールデンパス3本（最短・実用・AI）を README と sample 導線で固定
- KPI の観測入口を `docs/current/historical-notes/phase1-execution-plan.md` に明記

運用上のゲート:

- 初回成功率が閾値未達の状態では次フェーズへ進まない
- 「READMEと違う」報告を 0 件へ収束させるまで新規拡張を抑制

## Phase A（短期: 1〜2週）: 品質ゲート運用の固定化

### 状態
**進行準備完了（未着手）**

### 主な施策

1. `test:all:ci` の branch protection 必須化
2. 回帰テスト分類タグ（`schema/exporter/preview/mcp`）導入
3. PR テンプレートへ「影響範囲」「ロールバック方法」「テスト分類」を追加

### 追跡チケット

- `T-20260320-005`（エピック）
- `T-20260320-006`
- `T-20260320-007`
- `T-20260320-008`

---

## Phase B（中期: 3〜6週）: 大型モジュール責務分割

### 状態
**進行準備完了（未着手）**

### 主な施策

1. `schema-manager` のロード/検証/キャッシュ分離
2. `react-exporter` のテンプレート生成責務抽出
3. `textui-core-engine` の I/O・ドメイン・整形分離

### 追跡チケット

- `T-20260320-009`（エピック）
- `T-20260320-010`
- `T-20260320-011`
- `T-20260320-012`

---

## Phase C（中長期: 6〜10週）: AI設計フロー品質向上

### 状態
**未着手**

### 主な施策

1. `generate_ui` の補完品質向上（ユースケース別）
2. `explain_error` の提案テンプレート改善
3. OpenAPI import の実案件寄りケース拡充
4. サンプル入力（要件文 -> DSL -> 出力）拡充

### 完了条件（DoD）

- 追加ケースで `validate` 通過率が改善
- 回帰テスト（unit/integration/e2e/regression）を維持

---

## Phase D（中長期: 10週〜）: 運用機能とDXの強化

### 状態
**未着手**

### 主な施策

1. State ロック戦略の強化と運用定義
2. CI 差分運用（`validate/plan/apply`）の定常化
3. 初期導入/障害復旧/リリースチェック導線の改善

## 5. KPI（継続観測）

- AIフロー成功率（初回 validate 通過）: **90% 目標**
- `plan` ノイズ差分率: **5%以下**
- MCP起因エラー率: **3%未満**
- 初回導入時間: **10分目標**

## 6. 直近の推奨着手順

1. Phase A（運用固定化）を先行
2. Phase B（大型分割）へ進む
3. Phase C/D は A/B の成果を前提に段階着手

---

この v2 は「完了済みと未完了を分離し、次に進む判断をしやすくする」ための更新版です。
