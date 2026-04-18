# v2 比較ロジック設計 F: evidence 生成ルール

設計フェーズ成果物。コード実装は含まない。
前提: 設計A〜E 完了済み。`EvidenceShape` 3種は `docs/future/types/v2/evidence.ts` で定義済み。

---

## 論点F-1: evidence を添付するイベントの範囲

**決定: `layer: semantic` に分類され、かつ registry に登録された diff_event にのみ evidence を添付する。**

layer 分類:

| layer | 対象 diff_event |
|---|---|
| `semantic` | `entity_state_changed`, `transition_edge_changed`, `component_action_changed`, `component_availability_changed`, `component_guard_changed` |
| `surface` | `entity_renamed` |
| `structure` | `entity_added`, `entity_removed`, `transition_added`, `transition_removed`, `component_added`, `component_removed` |

- `structure` / `surface` イベントは、存在差分または表示ラベル変化の記録であり、registry にある evidence_shape の比較対象ではない。
  evidence_shape は before/after ペアを前提とするため、これらのイベントへの添付は不適切。
- `semantic` イベントでも registry 未登録のものは `canonical_predicate` 側で説明し、evidence は空配列にする。

根拠: evidence は「なぜ変化と判断したか」の根拠であり、structure / surface イベントは
存在/非存在という事実だけで根拠が自明。evidence を添付しても情報が増えない。

---

## 論点F-2: evidence_shape 選択マッピング（閉じた表）

**決定: 以下のマッピング表を v2 の閉じた規則とする。**

### semantic イベント → evidence_shape マッピング

| diff_event | 適用 evidence_shape | 選択根拠 |
|---|---|---|
| `entity_state_changed` | なし（空 evidence） | registry 未登録。state 変化は `canonical_predicate` で表現 |
| `transition_edge_changed` | `state_machine.transition` | registry 登録済みで from/to/trigger が直接対応 |
| `component_action_changed` | なし（空 evidence） | registry 未登録。action 変化は `canonical_predicate` で表現 |
| `component_availability_changed` | なし（空 evidence） | 3フィールドの before/after は `explanation.canonical_predicate` に収録（F-3参照） |
| `component_guard_changed` | なし（空 evidence） | CanonicalPredicate の変化は `explanation.canonical_predicate` で表現 |

### structure / surface イベント → evidence なし（F-1 の決定により）

| diff_event | evidence |
|---|---|
| `entity_added` / `entity_removed` / `entity_renamed` | `[]`（空配列） |
| `transition_added` / `transition_removed` | `[]`（空配列） |
| `component_added` / `component_removed` | `[]`（空配列） |

### `state_machine.transition` evidence の組み立てルール

```typescript
// transition_edge_changed の場合
evidence: [{
  evidence_shape: 'state_machine.transition',
  before: { from: prev.from, to: prev.to, trigger: `${prev.trigger.domain}.${prev.trigger.type}` },
  after:  { from: next.from, to: next.to, trigger: `${next.trigger.domain}.${next.trigger.type}` }
}]
```

> `copy_locale.message_string` と `data_contract.field_requiredness` は現在の 5軸設計では
> 直接対応する diff_event がない。将来の diff_event 拡張時に使用する予約済みシェイプとして扱う。

---

## 論点F-3: evidence が生成できない場合の V2DiffRecord の形

**決定: evidence が生成できない場合は `evidence: []`（空配列）を使用する。null や undefined にしない。**

適用ケース:
- `entity_state_changed`: registry 未登録 → `evidence: []`
- `component_action_changed`: registry 未登録 → `evidence: []`
- `component_availability_changed`: evidence_shape が対応しない → `evidence: []`
- `component_guard_changed`: canonical_predicate で表現するため evidence は `[]`
- DSL の情報が不足（`state` が `undefined` 等）: `evidence: []` で記録し confidence を参照

空配列の場合の V2DiffRecord 例:

```typescript
const record: V2DiffRecord = {
  decision: {
    diff_event: 'component_availability_changed',
    target_id: component.id,
    confidence: 1.0,
    review_status: 'approved',
  },
  explanation: {
    evidence: [],  // availability の before/after は下記 canonical_predicate に収録
    canonical_predicate: {
      // availability 変化の場合: 両側 availability の構造を predicate 形式で表現
      // (設計D-2 で「explanation_payload に 3フィールドの before/after を収録」と予告)
      all_of: [
        { fact: 'availability', op: 'eq', value: { visibility: next.visibility, enabled: next.enabled, editability: next.editability } }
      ]
    }
  }
};
```

型整合: `ExplanationPayload.evidence` は `EvidenceShape[]` であり、空配列 `[]` は型的に valid。

---

## 完全マッピング確認（12 diff_event 全件）

| diff_event | layer | evidence_shape | canonical_predicate |
|---|---|---|---|
| `entity_added` | structure | `[]` | なし |
| `entity_removed` | structure | `[]` | なし |
| `entity_renamed` | surface | `[]` | なし |
| `entity_state_changed` | semantic | `[]` | entity_state before/after |
| `transition_added` | structure | `[]` | なし |
| `transition_removed` | structure | `[]` | なし |
| `transition_edge_changed` | semantic | `state_machine.transition` | なし |
| `component_added` | structure | `[]` | なし |
| `component_removed` | structure | `[]` | なし |
| `component_action_changed` | semantic | `[]` | action before/after |
| `component_availability_changed` | semantic | `[]` | availability 3フィールド |
| `component_guard_changed` | semantic | `[]` | guard の CanonicalPredicate |

---

## 依存関係

| 前提 |
|---|
| 設計D-2: availability の詳細は explanation_payload に収録と予告済み |
| docs/future/types/v2/evidence.ts: EvidenceShape 3種定義 |
| docs/future/types/v2/diff-record.ts: ExplanationPayload 型 |

| 次ステップ |
|---|
| 設計G: 複数 diff_event 同時発生と sort order |
| 設計H: V2SemanticDiffProvider 実装アーキテクチャ |

---

*作成: 2026-04-19 / チケット: v2比較ロジック設計F*
