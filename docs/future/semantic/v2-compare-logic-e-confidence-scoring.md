# v2 比較ロジック設計 E: confidence スコアリング

設計フェーズ成果物。コード実装は含まない。
前提: 設計A〜D 完了済み。設計B-2・D-3 で予告された confidence 規定をここで確定する。

**正本（P4-11）**: 曖昧さ判定に用いる閾値 `0.8` の数値の単一定義は `docs/future/types/v2/diff-record.ts` の **`export const AMBIGUITY_THRESHOLD`** とする。設計E 本文の `0.8` および `confidence < 0.8` は、いずれも同一定数を指す。
**正本（T-20260419-029）**: `confidence_band` は caller が直接書かず、`docs/future/types/v2/diff-record.ts` に示す `createDecisionPayload(...)` 相当の factory で `confidence` と `AMBIGUITY_THRESHOLD` から自動導出する。

---

## 論点E-1: confidence 初期値と低下条件

**決定: 判定ルートに応じた初期値テーブルと、低下条件を以下の通り確定する。**

### confidence 初期値テーブル

| 判定ルート | 初期値 | 根拠 |
|---|---|---|
| entity.id 完全一致（同一 entity） | `1.0` | 決定論的同一性 |
| entity.name 補助一致（B-4） | `0.7` | 補助キーで同定したが安定参照が欠ける |
| entity.id 不一致 + name 一致（B-2 曖昧） | `0.5` | 曖昧な改名可能性（B-2 で確定済み） |
| entity.id 不一致 + name 不一致（別 entity） | `1.0` | 決定論的別 entity |
| component.id 完全一致（同一 component） | `1.0` | 決定論的同一性 |
| component.id 不一致（removed + added） | `1.0` | 決定論的別 component（C-3）|
| transition.id 完全一致（matched） | `1.0` | 決定論的同一性 |
| transition.id 不一致（removed + added） | `1.0` | 決定論的別 transition |

### confidence 低下条件（初期値からの減算）

| 低下条件 | 減算量 | 適用後最小値 | 根拠 |
|---|---|---|---|
| guard に `UnresolvedPredicate` が含まれる（D-3） | `-0.3` | `0.2` | guard の同値判定が不確実 |
| entity.id 不一致 + name 一致（B-2、既に 0.5） | 追加減算なし | `0.5` | 初期値で既に反映済み |
| entity.id 欠損の補助一致（B-4、既に 0.7） | 追加減算なし | `0.7` | 初期値で既に反映済み |

低下後の confidence は `max(0.0, initial - reduction)` で算出する。

### `ambiguity_reason` 必須条件

`confidence < 0.8` のとき `DecisionPayload.ambiguity_reason` を必須とする。
フォーマット: 短文1文、原因を示す（例: "entity id mismatch with matching name — possible rename"）。

---

## 論点E-2: UnresolvedPredicate が guard に含まれる場合の confidence 影響

**決定: guard 変化として record を生成するケースで `UnresolvedPredicate` が含まれる場合、confidence を `-0.3` 減算する。**

**補足:** 当該 guard 比較において `UnresolvedPredicate` が1つ以上含まれるとき、`-0.3` の減算は**1回のみ**とする（同一 guard 内の個数・出現箇所の数には比例しない）。

詳細ルール:

```
guard 比較時:
  if guardChanged
  AND (
    normalizeGuard(prev.guard) contains unresolved payload
    OR normalizeGuard(next.guard) contains unresolved payload
  ):
    confidence -= 0.3
    ambiguity_reason = "guard contains UnresolvedPredicate — structural equality is uncertain"
    → diff_event: 'component_guard_changed'
```

両側ともに `unresolved` かつ `reason` / `candidates` が同一の場合:
- guard 同値として扱い、`component_guard_changed` は生成しない
- confidence 低下も行わない

根拠: `UnresolvedPredicate` はノーマライズ時に解決できなかった述語を示す。
guard 変化を「なし」と誤判定することによる false-negative は、
「変化あり」の false-positive より影響が大きい（意味的差分の見落としになる）。

### -0.3 固定値の採用根拠と暫定性（T-20260419-036）

**固定値採用の根拠:**
- `0.3` は B-2（0.5）と D-3（0.7 = 1.0 - 0.3）の両ケースで `AMBIGUITY_THRESHOLD` を下回る最小の整数刻み値として選定した。
- 件数比例減算（UnresolvedPredicate の個数 × δ）は実データなしには δ を合理的に決定できないため、現フェーズでは採用しない。

**代替案（将来の再検討候補）:**
- 件数比例: `confidence -= min(count * 0.1, 0.5)` — UnresolvedPredicate 複数時により強く下げる
- 上限付き比例: 1件目 -0.3、2件目以降 -0.05 加算（上限 -0.5）

**再検討トリガー条件:**
1. 実運用で `component_guard_changed` の false-positive 率が 20% を超えることが計測された場合
2. UnresolvedPredicate を含む guard が多数発生し `confidence < AMBIGUITY_THRESHOLD` フィルタが過検出になった場合

---

## 論点E-3: review_status: needs_review の自動付与閾値

**決定: `confidence < 0.8` を閾値として v2 で固定する。**

自動付与ルール:

```typescript
function deriveReviewStatus(confidence: number): ReviewStatus {
  if (confidence < 0.8) return 'needs_review';
  return 'approved';  // 初期状態として 'approved' (人間が 'rejected' に変更可能)
}
```

```typescript
function createDecisionPayload(input): DecisionPayload {
  const confidence_band = input.confidence < AMBIGUITY_THRESHOLD ? 'low' : 'high';
  return confidence_band === 'low'
    ? {
        confidence_band,
        diff_event: input.diff_event,
        target_id: input.target_id,
        confidence: input.confidence,
        ambiguity_reason: input.ambiguity_reason!,
        review_status: input.review_status ?? 'needs_review',
      }
    : {
        confidence_band,
        diff_event: input.diff_event,
        target_id: input.target_id,
        confidence: input.confidence,
        ambiguity_reason: input.ambiguity_reason,
        review_status: input.review_status,
      };
}
```

固定とする根拠:
- `0.8` は B-2（0.5）と D-3（0.7 = 1.0 - 0.3）の両ケースをカバーする閾値である。
- 閾値を open（設定可能）にすると、呼び出し元が閾値を省略した場合の挙動が不定になり、
  V2SemanticDiffProvider の実装が複雑化する。
- v2 の設計原則は決定論的であり、可変パラメータを最小化することと一致する。
- `confidence_band` を factory 側で導出すれば、provider / mapper / ViewModel が band を手書きせずに済み、数値 `confidence` と判別子の乖離を防げる。

閾値変更の再検討条件: 「実運用フィードバックで false-positive/false-negative の比率が
著しく偏った場合」に別チケットで閾値の設定可能化を検討する。

---

## confidence と review_status の完全マッピング

| シナリオ | confidence | review_status | ambiguity_reason 必須 |
|---|---|---|---|
| id 完全一致、guard なし | 1.0 | approved | no |
| id 完全一致、guard に unresolved 由来の差分あり | 0.7 | needs_review | yes |
| entity.id 欠損だが name で同定 | 0.7 | needs_review | yes |
| entity id 不一致 + name 一致（B-2） | 0.5 | needs_review | yes |
| entity id 不一致 + name 一致 + unresolved guard 差分 | 0.2 | needs_review | yes |
| component id 不一致（removed/added） | 1.0 | approved | no |

---

## 依存関係

| 前提 | 本設計が参照するもの |
|---|---|
| 設計B-2 | entity ambiguous ケース confidence=0.5 |
| 設計D-3 | unresolved guard → confidence 低下予告 |
| diff-record.ts | `DecisionPayload.confidence` / `review_status` / `ambiguity_reason` フィールド |

| 次ステップ | 本設計を前提とするもの |
|---|---|
| 設計F | evidence 生成ルール |
| 設計G | 複数 diff_event 同時発生 |
| 設計H | V2SemanticDiffProvider 実装アーキテクチャ |

---

> 注: `screen_added` / `screen_removed` は current compare-logic v2 の non-goal であり、本書の confidence ルール対象外。

---

*作成: 2026-04-19 / チケット: v2比較ロジック設計E*
