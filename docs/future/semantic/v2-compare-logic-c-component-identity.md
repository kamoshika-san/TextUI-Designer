# v2 比較ロジック設計 C: Component 同一性判定

設計フェーズ成果物。コード実装は含まない。
前提: 設計A（走査パイプライン）・設計B（Entity同一性判定）完了済み。

---

## 論点C-1: components[].id 一致を同一性基準とする（v1 heuristic なし）

**決定: `component.id` 完全一致のみで同一性を判定する。v1 の heuristic similarity は使わない。**

方針の根拠:
- v1 heuristic similarity（label 類似度・type 一致等の組み合わせ）は false-positive を生む。
  同一 id を持たない component を「同一」と判断すると、意味的差分が隠蔽される。
- v2 の目的は **決定論的** な意味的差分であり、heuristic に依存することは設計原則に反する。
- `component.id` はレイアウト DSL で明示的に付与される安定識別子であり、
  同一性の根拠として最も信頼できる。

明文化ルール:
```
component 同一性 ≡ prev.components[i].id === next.components[j].id
v1 heuristic (label similarity, type match 等) は v2 では一切参照しない
```

---

## 論点C-2: 並び替え（reorder）を diff_event に含めるか

**決定: v2 スコープに含めない（non-goal）。**

根拠:
- 現行 12 事象（`DiffEvent` 型）に `component_reordered` は存在しない。
- component の表示順序変化は意味的差分（Action / Availability / Role 軸）ではなく
  **レイアウト差分**に分類される。v2 の対象軸は 5軸意味論であり、レイアウトは範囲外。
- reorder を検出するには安定した位置インデックスが必要だが、
  id 一致走査（C-1）では位置情報を使わないため、実装コストに見合わない。

Re-entry 条件: 「レイアウト差分専用の diff_event 群が設計された場合」に別チケットで検討する。

> **注**: reorder を non-goal とした場合、同一 id を持つ component の配列内位置が変わっても
> diff_event は発生しない。これは意図した動作である。

---

## 論点C-3: id 不一致 → component_removed + component_added ペアの生成規則

**決定: 両側 id リストの差集合でペアを生成する。**

ペア生成アルゴリズム（擬似コード）:

```typescript
function matchComponents(
  prevComponents: Component[],
  nextComponents: Component[],
): ComponentMatchResult[] {
  const prevById = new Map(prevComponents.map(c => [c.id, c]));
  const nextById = new Map(nextComponents.map(c => [c.id, c]));
  const results: ComponentMatchResult[] = [];

  // removed: prev にあって next にない
  for (const [id, prev] of prevById) {
    if (!nextById.has(id)) {
      results.push({ kind: 'removed', prev });
    }
  }

  // added: next にあって prev にない
  for (const [id, next] of nextById) {
    if (!prevById.has(id)) {
      results.push({ kind: 'added', next });
    }
  }

  // matched: 両側に存在 → 5軸差分（設計D）へ
  for (const [id, prev] of prevById) {
    const next = nextById.get(id);
    if (next) {
      results.push({ kind: 'matched', prev, next });
    }
  }

  return results;
}
```

ペア化の規則:
- `removed` と `added` は **ペアとして関連付けない**（entity B-2 と異なり、id 不一致の component は独立した追加/削除として扱う）
- `confidence` は `removed` / `added` ともに `1.0`（id 不一致は ambiguity なし）
- `review_status` は自動 `needs_review` なし（entity B-2 の曖昧ケースとは異なる）

entity B-2 との違い:
| | entity（B-2） | component（C-3） |
|---|---|---|
| id不一致+name一致 | 曖昧 → confidence=0.5 + needs_review | 非対応（component は name でマッチしない） |
| id不一致 | removed+added (confidence=0.5) | removed+added (confidence=1.0) |

---

## 依存関係

| 前提 | 本設計が依存するもの |
|---|---|
| 設計A | Screen → Entity → Component の走査順 |
| 設計B | entity の 1:1 マッチング方針（component も同方針） |

| 次ステップ | 本設計を前提とするもの |
|---|---|
| 設計D | `matched` ペアに対する 5軸差分検出アルゴリズム |

---

*作成: 2026-04-19 / チケット: v2比較ロジック設計C*
