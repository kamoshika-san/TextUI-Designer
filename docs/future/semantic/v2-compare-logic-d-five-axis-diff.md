# v2 比較ロジック設計 D: 5軸差分検出アルゴリズム

設計フェーズ成果物。コード実装は含まない。
前提: 設計A（パイプライン）・B（Entity同一性）・C（Component同一性）完了済み。
本設計は C で `matched` 判定されたペアに適用される。

---

## 論点D-1: ActionAxis 比較

**決定: `domain + type` のペアを1単位として比較する。部分変化（domain のみ等）も `component_action_changed` を生成する。**

ルール:

```
ActionAxis 変化 ≡ prev.action.domain !== next.action.domain
               OR prev.action.type  !== next.action.type
→ diff_event: 'component_action_changed'
```

部分変化の扱い:
- `domain` のみ変化 → `component_action_changed`（`type` のみ変化も同様）
- `domain + type` 両方変化 → `component_action_changed` を **1 record** で生成（2 record に分割しない）
- `action` フィールド自体が片側で `undefined` → added/removed と同等の変化として `component_action_changed` を生成

根拠: ActionAxis は `domain/type` の組み合わせで意味が決まる（`persist.update` と `workflow.update` は別の意味）。
フィールド別に複数 record を出すと1つの意味的変化が分断されレビュアーが混乱する。

---

## 論点D-2: AvailabilityAxis 比較

**決定: 3フィールドのうち1つでも変化した場合 `component_availability_changed` を 1 record 生成する。フィールド別の複数 record は出さない。**

ルール:

```
AvailabilityAxis 変化 ≡ prev.availability.visibility  !== next.availability.visibility
                      OR prev.availability.enabled     !== next.availability.enabled
                      OR prev.availability.editability !== next.availability.editability
→ diff_event: 'component_availability_changed'（1 record のみ）
```

1 record にまとめる根拠:
- `visibility: hidden` かつ `enabled: disabled` の組み合わせは一体の「非表示かつ非活性」という意味であり、
  フィールド別に分割すると意味的文脈が失われる。
- レビュアーは「availability が変わった」という事実と before/after の全状態を見れば判断できる。

フィールド別粒度が必要な場合の対処: `explanation_payload` に 3フィールドの before/after を収録することで詳細を提供する（設計F で規定）。

---

## 論点D-3: guard（CanonicalPredicate）の構造的同値判定

**決定: `all_of` / `any_of` の要素順が異なる場合も同値とする（順序非依存）。正規化後の構造比較を使用する。**

正規化ルール（比較前に両側へ適用）:

```
1. all_of / any_of の子要素を stable sort する（各要素を JSON.stringify して辞書順ソート）
2. not の内部は再帰的に正規化する
3. UnresolvedPredicate は `kind`, `reason`, 正規化済み `candidates` を比較に含める
```

同値判定アルゴリズム:

```typescript
function normalizeGuard(pred: CanonicalPredicate): string {
  if ('all_of' in pred) {
    const children = pred.all_of.map(normalizeGuard).sort();
    return `all_of:[${children.join(',')}]`;
  }
  if ('any_of' in pred) {
    const children = pred.any_of.map(normalizeGuard).sort();
    return `any_of:[${children.join(',')}]`;
  }
  if ('not' in pred) {
    return `not:${normalizeGuard(pred.not)}`;
  }
  if ('kind' in pred && pred.kind === 'unresolved') {
    return JSON.stringify({
      kind: 'unresolved',
      reason: pred.reason,
      candidates: [...(pred.candidates ?? [])].sort(),
    });
  }
  // FactPredicate: fact/op/value を安定文字列化
  return JSON.stringify({ fact: (pred as any).fact, op: (pred as any).op, value: (pred as any).value });
}

guard 変化 ≡ normalizeGuard(prev.guard) !== normalizeGuard(next.guard)
→ diff_event: 'component_guard_changed'
```

`UnresolvedPredicate` の扱い:
- 片側のみ `unresolved`、または両側にあっても `reason` / `candidates` が非同値のときは `component_guard_changed` を生成し、confidence を低下させる（設計E で規定）。
- 両側の `unresolved` が正規化後に同値なら guard 変化なしとして扱う。

`all_of` 要素順を同値とする根拠:
- `CanonicalPredicate` の型定義では `all_of` は論理 AND であり、要素順は意味に影響しない。
- DSL を人間が記述する際に記述順が揺れることは自然であり、順序差異を diff_event として報告することは false-positive となる。

---

## 論点D-4: entity.state 変化 と transition 変化の比較ルール

### entity.state 変化 → `entity_state_changed`

```
entity.state 変化 ≡ prev.entity.state !== next.entity.state
→ diff_event: 'entity_state_changed'
```

- `state` が `undefined` → 定義済みの変化も `entity_state_changed` を生成する
- entity level の diff_event として `V2EntityDiff.diffs` に収録される

### transition 変化 → `transition_edge_changed`

```
transition 照合キー: TransitionAxis.id（設計C の component と同様、id 完全一致で同一判定）
```

```
matched transition の変化検出:
  prev.trigger.domain !== next.trigger.domain  → transition_edge_changed
  prev.trigger.type   !== next.trigger.type    → transition_edge_changed
  prev.from           !== next.from            → transition_edge_changed
  prev.to             !== next.to             → transition_edge_changed
  いずれか1つでも変化 → diff_event: 'transition_edge_changed' を 1 record 生成
```

- `transition_added` / `transition_removed` は id の差集合で検出（設計C の component と同方式）
- 1 transition に複数フィールド変化があっても 1 record（D-1/D-2 と同方針）

---

## 5軸差分検出まとめ表

| 検出対象 | 比較キー | 生成 diff_event | granularity |
|---|---|---|---|
| action (domain/type) | prev.action ↔ next.action | `component_action_changed` | 1 record |
| availability (3フィールド) | visibility/enabled/editability | `component_availability_changed` | 1 record |
| guard (CanonicalPredicate) | normalizeGuard() 結果 | `component_guard_changed` | 1 record |
| entity.state | prev.state ↔ next.state | `entity_state_changed` | 1 record |
| transition (id同一) | trigger/from/to | `transition_edge_changed` | 1 record |
| transition (id差集合) | id 不一致 | `transition_added` / `transition_removed` | 各1 record |

---

## 依存関係

| 前提 | 本設計が依存するもの |
|---|---|
| 設計A/B/C | matched ペアの生成ロジック |

| 次ステップ | 本設計を前提とするもの |
|---|---|
| 設計E | confidence スコアリング（D-3 の unresolved guard 扱いを含む） |
| 設計F | evidence 生成ルール（各 diff_event への evidence_shape マッピング） |
| 設計G | 複数 diff_event の同時発生と sort order |
| 設計H | V2SemanticDiffProvider 実装アーキテクチャ |

---

*作成: 2026-04-19 / チケット: v2比較ロジック設計D*
