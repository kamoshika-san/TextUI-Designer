# Maintainability Score & Improvement Proposal (2026-03-20)

## 結論

**現状スコア: 88 / 100（A-）**

- 直近で大きい保守性改善（configuration 生成化、CommandManager 分離、MCP DTO 分離、preview-capture 分割、CLI 遅延ロード）が完了し、構造リスクは明確に低下した
- 一方で、大型モジュール分割と CI 運用固定化は未完了のため、90+ 到達には追加施策が必要

---

## 採点ルーブリック（100点満点）


| 観点              | 配点      | 現状     | 根拠（要約）                                                                |
| --------------- | ------- | ------ | --------------------------------------------------------------------- |
| 品質ゲート運用         | 20      | 18     | `pretest:ci` と `test:all:ci` は整備済み、branch protection 必須化は未完           |
| 型安全性            | 20      | 19     | `strict: true` + 追加静的チェック導入済み（`noImplicitReturns` 等）                  |
| テスト容易性          | 20      | 17     | unit/integration/e2e/regression の分離は維持、失敗分類タグ運用は未導入                   |
| 設計の分割容易性        | 20      | 16     | 責務分離は進展（preview-capture / MCP / commands）、core/export/schema の大型分割が残る |
| ドキュメント/オンボーディング | 20      | 18     | `MAINTAINER_GUIDE.md` を整備済み、古い周辺ドキュメント更新タスクは残る                        |
| **合計**          | **100** | **88** |                                                                       |


---

## 直近で反映した改善（完了済み）

1. **設定定義の単一化と生成運用**
  - `src/config/configuration-properties.ts` を正本化し、`sync/check:configuration` を導入
2. **CommandManager の登録レイヤ化**
  - `src/services/commands/`* へ委譲し、マネージャ本体の責務を縮小
3. **MCP `capture_preview` の DTO/mapper/adapter 分離**
  - 入力検証・変換・CLI引数組み立てを分離し、保守境界を明確化
4. **Preview Capture の責務分割**
  - `src/utils/preview-capture/`* へ分割し、障害切り分けと修正範囲を局所化
5. **CLI コールドスタート改善**
  - `src/cli/index.ts` の遅延ロード化で不要依存読み込みを削減

---

## 現在の主な負債（優先度順）

1. **大型モジュールの残存**
  - Issue A 対象の `textui-core-engine` / `react-exporter` / `schema-manager` 分割は完了
  - 残る主要ホットスポットとして `pug-exporter` の責務集中を次の構造改善対象とする
2. **品質ゲート運用の固定化不足**
  - `test:all:ci` 必須化（branch protection）と失敗分類タグが未運用
3. **ドキュメント鮮度のばらつき**
  - 一部ガイドの最新化タスクが残っており、運用判断の一貫性を下げるリスクがある

---

## 改善提案（未完了タスクに限定）

### フェーズ1（1〜2週間）: 運用固定化

- `test:all:ci` の branch protection 必須化
- 回帰テスト分類タグ（`schema/exporter/preview/mcp`）導入
- PR テンプレートに「影響範囲」「ロールバック方法」「テスト分類」を追加

**期待効果:** 品質判定のばらつき低減（+1〜2点）

### フェーズ2（3〜6週間）: 構造改善
- `pug-exporter` の責務分割（Issue A の補完）
- `ExtensionLifecycleManager` の起動/終了処理のステージ化（段階化）

**期待効果:** 変更容易性・レビュー性向上（+2〜3点）

### フェーズ3（継続）: ドキュメント更新の定期化

- メンテナー向け主要ドキュメントの更新サイクルを固定化
- 完了済み改善と未着手改善の混在を防ぐ

**期待効果:** オンボーディング効率の維持（+0〜1点）

---

## 到達目標（スコア目安）

- フェーズ1完了: **89〜90点**
- フェーズ2完了: **90〜92点**
- フェーズ3定着: **91〜93点**

---

## 参照（実行管理）

- 実務ガイド: `docs/MAINTAINER_GUIDE.md`
- 未着手バックログ: `docs/maintainability-issues.md`（運用中の場合）
- 関連チケット:
  - `T-20260320-005`〜`T-20260320-012`

---

## 最終提案（要約）

> 以前の「82点で基礎改善が必要」フェーズは脱し、現在は「88点で運用固定化と大型分割をやり切る段階」です。  
> 次は **品質ゲート固定化（Issue B）を先行**し、その後に **大型モジュール分割（Issue A）**へ進むのが最も安全です。

