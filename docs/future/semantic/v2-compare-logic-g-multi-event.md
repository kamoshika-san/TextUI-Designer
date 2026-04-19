# v2 比較ロジック設計 G: 複数 diff_event の同時発生

設計フェーズ成果物。コード実装は含まない。
前提: 設計A〜F 完了済み。

---

## 論点G-1: 複数 diff_event 同時発生 → 複数 record か 1 record に集約か

**決定: 同一 entity/component に複数 diff_event が発生した場合、複数の V2DiffRecord を返す（集約しない）。**

ルール:

```
同一 component に対して:
  component_action_changed + component_availability_changed が同時発生
  → V2DiffRecord を 2 件返す（各1 record）

同一 entity に対して:
  entity_state_changed + component_action_changed（その entity の component）
  → V2DiffRecord を各々独立して返す
```

集約しない根拠:
- 各 diff_event は意味的に独立した変化であり、集約すると「何が変わったか」の粒度が失われる。
- レビュアーは action 変化と availability 変化を別々に承認/却下できる必要がある（`review_status` が per-record）。
- V2DiffRecord の型設計（`decision.diff_event: DiffEvent` は単一値）が複数 event の集約を禁止している。

同一 component への複数 record は `V2ComponentDiff.diffs` 配列に収録される（型設計と整合）。

---

## 論点G-2: 返す順序（sort order）の定義

**決定: sort order を定義する。以下の優先順で固定する。**

sort キー（優先順）:

```
1. layer: `structure` イベントを先
2. layer: `surface` イベントを次
3. layer: `semantic` イベントを後
4. 同一 layer 内は **下記「具体的な全順序」で固定**（辞書順ではなく、実装・スナップショットの安定用の正本列）
```

具体的な全順序（`docs/future/types/v2/diff-record.ts` の `DiffEvent` union と **同一の 12 語**、余分な行なし）:

```
entity_added
entity_removed
transition_added
transition_removed
component_added
component_removed
--- structure / surface 境界 ---
entity_renamed
--- surface / semantic 境界 ---
entity_state_changed
transition_edge_changed
component_action_changed
component_availability_changed
component_guard_changed
```

> **注（P2-3）**: `component_label_changed` は closed vocabulary に **含めない**（PM 決定: ラベルは surface のみで 5 軸意味差分の対象外）。将来採用する場合は `DiffEvent`・本表・設計 F/E を同時更新する。

sort order を定義する根拠:
- sort order が未定義だと実装ごとに出力が揺れ、スナップショットテストが不安定になる。
- `structure → surface → semantic` の順は「存在確認 → 表示差分 → 業務意味」という自然な読み順に対応する。
- v2 のスナップショットテスト安定性と将来の CI diff 比較のために sort order は固定が必須。

---

## 依存関係

| 前提 |
|---|
| 設計D: 5軸差分検出（各 diff_event の生成ルール） |
| 設計F: evidence 添付ルール（per-record） |

| 次ステップ |
|---|
| 設計H: V2SemanticDiffProvider 実装（G の sort order を適用する場所） |

---

*作成: 2026-04-19 / チケット: v2比較ロジック設計G*
