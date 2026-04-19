# v2 比較ロジック設計 A: 走査パイプライン構造

設計フェーズ成果物。コード実装は含まない。

---

## 論点A-1: 走査順序と双方向差分

**決定: Screen → Entity → Component の単方向走査。added/removed 検出は同じパス内で行う。**

走査は prev/next の両側セットを同時に参照しながら 1 パスで処理する。
具体的には各レベルで以下の 3 分岐を行う:

| 状況 | 処理 |
|---|---|
| prev にのみ存在 | `*_removed` イベントを生成 |
| next にのみ存在 | `*_added` イベントを生成 |
| 両側に存在 | 5 軸差分（後続ロジック B〜D）に進む |

双方向差分検出を別パスに分離しない理由: 分離すると走査コストが 2 倍になり、
イベント順序の定義が複雑になる。同一パスで処理する方が実装が単純で出力順が安定する。

---

## 論点A-2: screen_id が片側にのみ存在する場合のスコープ

**決定: `screen_added` / `screen_removed` は compare-logic v2 現フェーズの non-goal。現行の closed vocabulary には含めない。**

根拠:
- `screen_added` / `screen_removed` はページ追加/削除という最大粒度の変化であり、現行 compare-logic v2 が扱う entity/component 起点の意味差分より一段外側の責務になる。
- ただし現行の `docs/future/types/v2/diff-record.ts` は 12 event の closed vocabulary を前提としており、この2件はまだ含まれない。
- compare-logic v2 の現行スコープでは screen 単体の追加/削除は扱わず、A〜H の本文では entity/component 比較の記録契約に集中する。

> **注**: 将来 `screen_added` / `screen_removed` を正式に追加する場合は、別フェーズで `docs/future/types/v2/diff-record.ts` と sort/evidence/confidence 規則を同時更新する。

---

## 論点A-3: `compareScreen` が片側 `undefined` のときの記録（P1-2）

**決定: `V2ScreenDiff` は `outOfScope: true` を持つ専用枝と、通常の `diffs` / `entities` を持つ枝の判別可能 union とする（`docs/future/types/v2/dsl-structure.ts`）。**

- **スコープ外**: `prev` または `next` が `undefined` のときは `{ screen_id, outOfScope: true }` を返す。`diffs` / `entities` を空配列で返さない（空配列は「両側とも Screen が存在し、当該レベルに差分が無い」という in-scope の意味に留める）。
- **スコープ内・変化なし**: 両側 `Screen` が存在し、entity/component 走査の結果イベントが無い場合は `{ screen_id, diffs: [], entities: [] }` のように in-scope 枝で空配列を返す。

根拠: 空配列だけでは「比較対象外」と「比較したが結果ゼロ」を区別できず、provider や UI が誤読する。`outOfScopeScreenIds` のような配列メタは単一 screen 比較では冗長のため、ブール専用枝を採用する。

---

## パイプライン入出力型シグネチャ

以下は TypeScript 風擬似コードで示す設計上の関数シグネチャである（実装ファイルではない）。

```typescript
import type { Screen, V2ScreenDiff, V2EntityDiff, V2ComponentDiff } from '../types/v2/dsl-structure';

/**
 * トップレベルエントリポイント。
 * prev または next が undefined の場合は `V2ScreenDiffOutOfScope`（`outOfScope: true`）を返す。
 * 両側が定義されている場合は `V2ScreenDiffInScope`（`diffs` / `entities` 必須）を返す。
 */
function compareScreen(
  screenId: string,
  prev: Screen | undefined,
  next: Screen | undefined,
): V2ScreenDiff;

/**
 * Entity レベル比較。entity.id を照合キーとする。
 * prev/next どちらかが undefined なら entity_added / entity_removed を生成する。
 */
function compareEntity(
  entityId: string,
  prev: Entity | undefined,
  next: Entity | undefined,
): V2EntityDiff;

/**
 * Component レベル比較。component.id を照合キーとする。
 * prev/next どちらかが undefined なら component_added / component_removed を生成する。
 */
function compareComponent(
  componentId: string,
  prev: Component | undefined,
  next: Component | undefined,
): V2ComponentDiff;
```

型参照: `Screen`, `V2ScreenDiff`（`V2ScreenDiffInScope | V2ScreenDiffOutOfScope`）, `V2EntityDiff`, `V2ComponentDiff` は
`docs/future/types/v2/dsl-structure.ts` で定義済み。

---

## 走査順序の詳細フロー

```
compareScreen(screenId, prev, next)
  ├─ prev == undefined OR next == undefined → { screen_id: screenId, outOfScope: true }  // A-3: 空配列では表さない
  └─ 両側存在 → in-scope 枝 `{ screen_id, diffs: [], entities: [...] }`（screen 直下の diffs は通常 []）
       └─ entities は union(prev.entity.id, next.entity.id) をキーに各 entity へ
         └─ compareEntity(entityId, prev.entity | undefined, next.entity | undefined)
              ├─ prev == undefined → diffs: [entity_added], components: []
              ├─ next == undefined → diffs: [entity_removed], components: []
              └─ 両側存在 →
                   diffs: entity レベル 5 軸比較（設計項目 B / D）
                   components: union(prev.components[].id, next.components[].id) をキーに
                     └─ compareComponent(componentId, prev | undefined, next | undefined)
                          ├─ prev == undefined → diffs: [component_added]
                          ├─ next == undefined → diffs: [component_removed]
                          └─ 両側存在 → 5 軸比較（設計項目 C / D）
```

> **注**: compare-logic v2 の現行スコープでは `Screen` は `entity` を単数形で保持する。
> ontology 側にある複数 entity の説明は将来拡張の余地であり、現行比較ロジックの対象外とする。
> 1 対多マッチング（entity 分割/合算）は設計項目 B-3 の re-entry 条件が満たされるまで扱わない。

---

## 依存関係

| 次ステップ | 設計項目 |
|---|---|
| Entity 同一性判定ルール | B |
| Component 同一性判定ルール | C |
| 5 軸差分検出アルゴリズム | D（B, C 完了後） |

---

*作成: 2026-04-19 / チケット: v2比較ロジック設計A*
## A-0 Addendum: compare 入力前段の DSL id validation

- `compareScreen` に入る前に、対象 `Screen` の `screen` / `entity.id` / `components[].id` / `transitions[].id` を検査する前段 validation を置く
- 前段 validation の責務は「比較キーとして使う stable reference が compare 可能な状態か」を判定することであり、diff_event を生成しない
- `screen` 欠損、`components[].id` 重複、`transitions[].id` 重複のように compare キーが壊れるケースは fail-fast とし、compare-logic A〜D へ進めない
- `entity.id` 欠損は fail-fast にしない。B-4 の補助規則が扱う曖昧ケースとして compare 継続可能だが、重複は fail-fast とする
- 前段 validation の結果は compare 本体の `outOfScope: true` とは別概念である。`outOfScope` は screen-level add/remove non-goal を表し、入力不正の隠れ蓑に使わない
