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

**決定: v2 スコープ。`screen_added` / `screen_removed` は v2 DiffEvent として扱う。**

根拠:
- `screen_added` / `screen_removed` はページ追加/削除という最大粒度の意味的変化であり、
  意味的差分として通知すべき最重要イベントである。
- Non-goal とした場合、画面追加をレビュアーが見逃すリスクが生じる。
- `V2ScreenDiff` の `diffs` に `decision.diff_event: 'screen_added'` / `'screen_removed'` を
  記録することで型の拡張なしに表現できる（`V2EntityDiff` / `V2ComponentDiff` は空リスト）。

> **注**: `DiffEvent` 型への `screen_added` / `screen_removed` の追加は
> `docs/future/types/v2/diff-record.ts` の拡張チケットとして別途起票する。
> 現行 12 事象リストにはこれら 2 事象が含まれていない。

---

## パイプライン入出力型シグネチャ

以下は TypeScript 風擬似コードで示す設計上の関数シグネチャである（実装ファイルではない）。

```typescript
import type { Screen, V2ScreenDiff, V2EntityDiff, V2ComponentDiff } from '../types/v2/dsl-structure';

/**
 * トップレベルエントリポイント。
 * prev または next が undefined の場合は screen_removed / screen_added を生成する。
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

型参照: `Screen`, `V2ScreenDiff`, `V2EntityDiff`, `V2ComponentDiff` は
`docs/future/types/v2/dsl-structure.ts` で定義済み。

---

## 走査順序の詳細フロー

```
compareScreen(screenId, prev, next)
  ├─ prev == undefined → diffs: [screen_added], entities: []
  ├─ next == undefined → diffs: [screen_removed], entities: []
  └─ 両側存在 →
       diffs: []  (screen レベルの直接 diff はなし — entity/component に委譲)
       entities: union(prev.entity.id, next.entity.id) をキーに
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

> **注**: 現行の `Screen` 型は `entity` を単数形で保持する（複数 entity は非サポート）。
> entity の union 操作はスクリーン内 1 entity のみを想定した簡易形。
> 1 対多マッチング（entity 分割/合算）は設計項目 B-3 で別途決定する。

---

## 依存関係

| 次ステップ | 設計項目 |
|---|---|
| Entity 同一性判定ルール | B |
| Component 同一性判定ルール | C |
| 5 軸差分検出アルゴリズム | D（B, C 完了後） |

---

*作成: 2026-04-19 / チケット: v2比較ロジック設計A*
