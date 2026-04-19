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
4. Logical 枝（`AllOfPredicate` / `AnyOfPredicate` / `NotPredicate`）は `op: 'all_of' | 'any_of' | 'not'` を必須とし、型ガードは `in` ではなく `switch (pred.op)` を正とする（P2-4）
```

**安全要件（P4-12）** — `normalizeGuard` の入力・実装境界:

- **再帰深度**: `all_of` / `any_of` / `not` の入れ子は **最大深度 4**（ルートの `CanonicalPredicate` を深さ 0 と数え、Logical 子へ降りるたびに +1）。これを超える入力は v2 本節の正規化対象外とし、実装は拒否するか設計外として扱う（詳細は実装チケットでよい）。
- **`value` フィールド**: `eq` / `ne` / `in` 等に付随する `value` は **`string | number | boolean` のみ**とする（オブジェクト・配列を `value` に載せない）。**`undefined` を `value` に渡さない**。
- **JSON.stringify**: 正規化に渡すオブジェクトに **`undefined` 値のプロパティを含めない**（`JSON.stringify` はキーを落とし比較が不安定になるため）。`UnresolvedPredicate` の `candidates` の各要素も上記プリミティブに収まる前提とする。

同値判定アルゴリズム:

```typescript
function normalizeGuard(pred: CanonicalPredicate): string {
  if ('kind' in pred && pred.kind === 'unresolved') {
    return JSON.stringify({
      kind: 'unresolved',
      reason: pred.reason,
      candidates: [...(pred.candidates ?? [])].sort(),
    });
  }
  switch (pred.op) {
    case 'all_of': {
      const children = pred.all_of.map(normalizeGuard).sort();
      return `all_of:[${children.join(',')}]`;
    }
    case 'any_of': {
      const children = pred.any_of.map(normalizeGuard).sort();
      return `any_of:[${children.join(',')}]`;
    }
    case 'not':
      return `not:${normalizeGuard(pred.not)}`;
    case 'eq':
    case 'ne':
    case 'in':
    case 'exists': {
      // P4-12: `value` は string|number|boolean のみ; `undefined` はオブジェクトに載せない
      const base = { fact: pred.fact, op: pred.op } as { fact: string; op: string; value?: string | number | boolean };
      if ('value' in pred && pred.value !== undefined) base.value = pred.value;
      return JSON.stringify(base);
    }
  }
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
## D-1 Addendum: Action 正規化前提

- D-1 が比較する `prev.action` / `next.action` は、ontology 正本「Action 正規化の決定論的手順」で **比較前に確定済みの `ActionAxis`** とする
- D-1 自体では `trigger` 文字列からの推測、複数候補間の tie-break、文言ラベルからの補完を行わない
- `ActionAxis` を 1 件に確定できない場合は、D-1 に入る前段で未解決扱いへ落とし、compare-logic v2 では `needs_review` 前提の曖昧ケースとして保持する
