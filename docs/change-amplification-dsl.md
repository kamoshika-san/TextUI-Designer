# DSL 型と descriptor の change amplification（Step 8 メモ）

## 目的

新しいビルトインコンポーネントを追加するとき、**複数箇所**を一貫して更新しないと実行時・スキーマ・補完がずれる。Step 8 ではその「触るべき面」をテストとドキュメントで固定する。

## 機械的に検知していること

`tests/unit/dsl-types-descriptor-sync.test.js` が次を検証する。

- `src/domain/dsl-types.ts` の `DSL_COMPONENT_KINDS`（`ComponentDef` の判別子）
- `src/components/definitions/built-in-components.ts` の `BUILT_IN_COMPONENTS`

両者は**同一集合**でなければならない。片方だけ更新すると CI で失敗する。

## 新コンポーネント追加時のチェックリスト（推奨順）

1. `BUILT_IN_COMPONENTS` に名前を追加する（**正本**）。`DSL_COMPONENT_KINDS` はここから導出（T-091）。
2. `ComponentDef` union と各 `*Component` 型・型ガードを `dsl-types.ts` に追加する。
3. `COMPONENT_DEFINITIONS` および関連する manifest / exporter-renderer / schema 生成パイプラインを更新する。
4. `npm run compile` と `npm test`（必要なら `npm run test:all`）を通す。

## 影響半径と監査（T-158）

- **`dsl-types` 変更時の波及経路（図）**・**文書/lint/test/script/PR の整合マトリクス**・**PM/TM 向け完了チェック**・**例外の期限付き台帳**: [dsl-types-change-impact-audit.md](dsl-types-change-impact-audit.md)

## 関連

- レビュー D 節の正本（俯瞰）: [architecture-review-D-change-amplification-canonical.md](architecture-review-D-change-amplification-canonical.md)
- 既存の descriptor 不変条件: `tests/unit/component-definitions-invariant.test.js` ほか
