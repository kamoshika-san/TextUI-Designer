# 将来: semantic 関連ドキュメント（`docs/future/semantic`）

Semantic Diff の **業務意味・ontology・v2 判定語彙**など、実装より先に固定したい仕様を置く。

## 収録

| 文書 | 説明 |
|------|------|
| [`semantic-meaning-core-ontology-v0-ja.md`](semantic-meaning-core-ontology-v0-ja.md) | 意味／差異／正規化／ontology、v2 方針・差分記録・論点3参照（v2 判定語彙の正本） |
| [`v2-compare-logic-a-pipeline.md`](v2-compare-logic-a-pipeline.md) | v2 比較ロジック A: 走査パイプラインと screen/entity/component の処理順 |
| [`v2-compare-logic-b-entity-identity.md`](v2-compare-logic-b-entity-identity.md) | v2 比較ロジック B: entity 同一性、rename、id 欠損時の補助規則 |
| [`v2-compare-logic-c-component-identity.md`](v2-compare-logic-c-component-identity.md) | v2 比較ロジック C: component 同一性と added/removed の扱い |
| [`v2-compare-logic-d-five-axis-diff.md`](v2-compare-logic-d-five-axis-diff.md) | v2 比較ロジック D: 5軸差分検出アルゴリズム |
| [`v2-compare-logic-e-confidence-scoring.md`](v2-compare-logic-e-confidence-scoring.md) | v2 比較ロジック E: confidence / `review_status` の算出規則 |
| [`v2-compare-logic-f-evidence-generation.md`](v2-compare-logic-f-evidence-generation.md) | v2 比較ロジック F: `evidence` と `canonical_predicate` の使い分け |
| [`v2-compare-logic-g-multi-event.md`](v2-compare-logic-g-multi-event.md) | v2 比較ロジック G: 複数 diff_event と sort order |
| [`v2-compare-logic-h-provider-architecture.md`](v2-compare-logic-h-provider-architecture.md) | v2 比較ロジック H: Provider 実装境界と `DiffCompareResult.v2` への収録方法 |

## 使い分け

- 概念・用語・比較原則の正本: `semantic-meaning-core-ontology-v0-ja.md`
- compare-logic v2 の論点別設計: `v2-compare-logic-*.md`
- compare-logic v2 の型断片: `docs/future/types/v2/`
- current compare-logic v2 の scope は entity/component 起点の意味差分。screen 単体の追加/削除は現フェーズの non-goal。

## 関連（リポジトリルートからのパス）

- v2 証拠レジストリ（`evidence_shape`）: `docs/v2-evidence-shapes-registry-ja.md`
- JSON Schema: `docs/future/schemas/v2/evidence/`
- コード寄り record 型: `docs/future/types/v2/diff-record.ts`

## 旧パス

- `docs/semantic-meaning-core-ontology-v0-ja.md` にスタブを残し、本フォルダへ誘導している。
