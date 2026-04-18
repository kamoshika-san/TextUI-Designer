# v2 比較ロジック設計 B: Entity 同一性判定

設計フェーズ成果物。コード実装は含まない。
前提: 設計A（走査パイプライン構造）完了済み。

---

## 論点B-1: entity.id / entity.name の評価順序

**決定: `entity.id` を第1キーとする。`entity.name` は第2キー（補助）。id 欠損時は補助規則で扱う。**

判定マトリクス:

| prev.id == next.id | prev.name == next.name | 判定 |
|---|---|---|
| ✓ | ✓ | 同一 entity（差分なし） |
| ✓ | ✗ | `entity_renamed`（id 一致が同一性の根拠） |
| ✗ | ✓ | 曖昧ケース → 論点B-2 へ |
| ✗ | ✗ | `entity_removed` + `entity_added`（別 entity） |

評価順序の根拠:
- `entity.id` はシステム識別子として安定しており、意図的な変更でのみ変わる。
- `entity.name` は表示文言であり、リネーム操作で変更されるため第2キーとして適切。
- id を先に評価することで、name 変化のみを `entity_renamed` として正確に捕捉できる。

---

## 論点B-2: entity.id 不一致 + entity.name 一致の曖昧ケース

**決定: `entity_removed` + `entity_added` ペアとして扱う（`entity_renamed` とはしない）。**

判定ルール:
- id 不一致は「別 entity として登録されている」という明示的な意図を示す。
- id が変化しているケースでは、同名 entity がリポジトリに複数存在する可能性もあり、
  システムが自動的に「改名」と判断することは危険である。
- `confidence: 0.5` を付与した上で `review_status: needs_review` を自動設定する
  （E の信頼スコア設計との連携点）。

実装規則:
```
if prev.id != next.id and prev.name == next.name:
  emit entity_removed(prev) with confidence=0.5, review_status=needs_review
  emit entity_added(next)  with confidence=0.5, review_status=needs_review
  // NOTE: 将来 entity_renamed に昇格できる信頼スコア設計は設計E で規定
```

根拠: `entity_renamed` は id 一致を前提とする（B-1 で確定）。id が変わった場合は
レビュアーに判断を委ねる方が安全であり、誤検知よりも見落とし防止を優先する。

---

## 論点B-3: 1:1 マッチングのみか、entity 分割/合算（1対多）をスコープとするか

**決定: v2 は 1:1 マッチングのみ。entity 分割/合算は non-goal。**

根拠:
- 1対多マッチングはグラフ最適化問題（最小コスト二部マッチング等）であり、
  単独の設計フェーズが必要な複雑度を持つ。
- 現行 DSL では 1 screen につき 1 entity であり、1対多が実際に発生するケースは
  多重継承的な画面設計に限られる（現在 non-goal なユースケース）。

Re-entry 条件: 「1 screen に複数 entity を持つ DSL 形式が正式サポートされた場合」に
別チケットとして再検討する。

---

## 論点B-4: `entity.id` が片側のみ存在、または両側欠損のケース

**決定: 現行 compare-logic v2 では name を補助キーに使い、同定できた場合も `review_status: needs_review` を付与する。**

ルール:

| ケース | 判定 | 付与 |
|---|---|---|
| 片側のみ `id` あり + `name` 一致 | 同一 entity | `confidence: 0.7`, `review_status: needs_review` |
| 両側 `id` 欠損 + `name` 一致 | 同一 entity | `confidence: 0.7`, `review_status: needs_review` |
| 上記以外 | `entity_removed` + `entity_added` | `confidence: 1.0` |

根拠:
- compare-logic v2 は現行 DSL の単一 entity 前提を守りつつ、id 欠損を即座に別 entity と断定しない。
- 一方で `id` 欠損は安定参照の弱化であり、決定論的同一性とは言えないため `needs_review` を付与する。
- `0.7` は「比較は成立したが補助キー依存」の扱いとして、設計E の閾値 `0.8` 未満に収まるよう固定する。

---

## entity 同一性判定アルゴリズム（擬似コード）

```typescript
// 戻り値: 'same' | 'renamed' | 'same_needs_review' | 'ambiguous' | 'different'
function classifyEntityPair(
  prev: Entity,
  next: Entity,
): EntityMatchResult {
  if (prev.id && next.id && prev.id === next.id) {
    return prev.name === next.name ? 'same' : 'renamed';
  }
  if (prev.id && next.id && prev.name === next.name) {
    return 'ambiguous';  // → entity_removed + entity_added (confidence=0.5)
  }
  if (prev.name === next.name) {
    return 'same_needs_review'; // → confidence=0.7, review_status=needs_review
  }
  return 'different';   // → entity_removed + entity_added (confidence=1.0)
}
```

型参照: `Entity` は `docs/future/types/v2/dsl-structure.ts` で定義済み（`id`, `name`, `state` フィールド）。

---

## 依存関係

| 前提 | 本設計が依存するもの |
|---|---|
| 設計A | 走査パイプライン（Screen → Entity の走査順） |

| 次ステップ | 本設計を前提とするもの |
|---|---|
| 設計C | Component 同一性判定（component.id を第1キーとする方針の参考） |
| 設計D | 5軸差分検出（entity.state 変化 → entity_state_changed の比較ルール） |
| 設計E | confidence スコアリング（論点B-2 / B-4 の confidence 規定） |

---

*作成: 2026-04-19 / チケット: v2比較ロジック設計B*
