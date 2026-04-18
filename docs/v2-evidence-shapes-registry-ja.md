# v2 `evidence_shape` レジストリ（正本）

Updated: 2026-04-18  
Ticket: `T-20260418-007`  
Status: 正本（判定用 `decision_payload.evidence` の形・検証）

## 位置づけ

- **検証の正本（案C）**: 各 `evidence_shape` ごとの **JSON Schema**（`docs/future/schemas/v2/evidence/*.schema.json`）。`evidence.evidence_shape` の値で **ちょうど1つ**のスキーマにマッチさせる。
- **説明の階層（案B）**: 本書の **ドメイン基底表** と **イベントオーバーレイ表**。レビュアはここから「不足キー」を追跡し、実装者は **同一内容を JSON Schema で機械検証**する。
- 方針の入口: `docs/future/semantic/semantic-meaning-core-ontology-v0-ja.md` の「論点3」節。

## `evidence_shape` 命名規約

- **グローバル一意**の文字列とする（ドメイン横断で衝突しない）。
- 推奨形式: `<semantic_domain>.<shape_slug>`（小文字、区切りは `.` と `_` のみ）。
- `shape_slug` は短い英語名（複数形可）。**`event` 名と同一にしない**（同名でも別 `evidence_shape` を増やす場合は slug で区別）。

## 整合表（`semantic_domain` × `event` → `evidence_shape`）

| `semantic_domain` | `event` | 許容 `evidence_shape` | JSON Schema |
|------------------|---------|------------------------|-------------|
| `state_machine` | `transition_edge_changed` | `state_machine.transition` | [`state_machine.transition.schema.json`](./future/schemas/v2/evidence/state_machine.transition.schema.json) |
| `copy_locale` | `copy_string_changed` | `copy_locale.message_string` | [`copy_locale.message_string.schema.json`](./future/schemas/v2/evidence/copy_locale.message_string.schema.json) |
| `data_contract` | `field_requiredness_changed` | `data_contract.field_requiredness` | [`data_contract.field_requiredness.schema.json`](./future/schemas/v2/evidence/data_contract.field_requiredness.schema.json) |

**整合ルール（MUST）**: `decision_payload` の `semantic_domain` と `event` の組が上表のいずれかであること。`evidence.evidence_shape` は、その行の **許容値と一致**すること。一致しない組・値は **検証エラー**（v2 では未登録形状を緩く通さない）。

## 案B: ドメイン基底（`before` / `after` 各オブジェクト）

各脚（`before` / `after`）に共通して課す **最小意味**。イベントで上乗せする。

| `semantic_domain` | 基底 MUST（各脚） | SHOULD |
|------------------|-------------------|--------|
| `state_machine` | `from`, `to` | `guard` |
| `copy_locale` | `message_key`, `locale`, `text` | `plural_form` |
| `data_contract` | `field_path`, `required` | `scope` |

## 案B: イベントオーバーレイ（基底への追加 MUST）

| `semantic_domain` | `event` | 上乗せ MUST（各脚） |
|------------------|---------|---------------------|
| `state_machine` | `transition_edge_changed` | `trigger` |
| `copy_locale` | `copy_string_changed` | （追加なし） |
| `data_contract` | `field_requiredness_changed` | （追加なし） |

## `evidence_shape` ごとの合成 MUST（レビュー用クイック表）

「基底 ∪ オーバーレイ」を各脚に適用した結果（= JSON Schema の `required` と整合）。

| `evidence_shape` | 各脚（`before` / `after`）の MUST |
|------------------|-----------------------------------|
| `state_machine.transition` | `from`, `to`, `trigger` |
| `copy_locale.message_string` | `message_key`, `locale`, `text` |
| `data_contract.field_requiredness` | `field_path`, `required` |

OPTIONAL（スキーマで追加プロパティ許可、`required` 外）: `guard`, `note`（`state_machine`）、`plural_form`, `note`（`copy_locale`）、`scope`, `note`（`data_contract`）。

## ルート結合スキーマ（任意）

登録済み3形の **排他結合**（`oneOf`）:

- [`union.schema.json`](./future/schemas/v2/evidence/union.schema.json)

新しい `evidence_shape` を増やしたら **本レジストリの表**と **`union.schema.json` の `oneOf`** を同時に更新する。

---

## `state_machine.transition`

### 最小例（MUST のみ）

```json
{
  "evidence_shape": "state_machine.transition",
  "before": {
    "from": "draft",
    "to": "submitted",
    "trigger": "workflow/submit"
  },
  "after": {
    "from": "draft",
    "to": "rejected",
    "trigger": "workflow/reject"
  }
}
```

### 最大例（OPTIONAL を含む）

```json
{
  "evidence_shape": "state_machine.transition",
  "before": {
    "from": "draft",
    "to": "submitted",
    "trigger": "workflow/submit",
    "guard": "role == submitter",
    "note": "申請直後の遷移"
  },
  "after": {
    "from": "draft",
    "to": "rejected",
    "trigger": "workflow/reject",
    "guard": "role == submitter",
    "note": "仕様変更後の遷移"
  }
}
```

---

## `copy_locale.message_string`

### 最小例（MUST のみ）

```json
{
  "evidence_shape": "copy_locale.message_string",
  "before": {
    "message_key": "expense.submit.confirm",
    "locale": "ja-JP",
    "text": "申請しますか？"
  },
  "after": {
    "message_key": "expense.submit.confirm",
    "locale": "ja-JP",
    "text": "提出してよろしいですか？"
  }
}
```

### 最大例（SHOULD / OPTIONAL を含む）

```json
{
  "evidence_shape": "copy_locale.message_string",
  "before": {
    "message_key": "items.count",
    "locale": "en-US",
    "text": "1 item",
    "plural_form": "one",
    "note": "単数形"
  },
  "after": {
    "message_key": "items.count",
    "locale": "en-US",
    "text": "{n} items",
    "plural_form": "other",
    "note": "複数形へ変更"
  }
}
```

---

## `data_contract.field_requiredness`

### 最小例（MUST のみ）

```json
{
  "evidence_shape": "data_contract.field_requiredness",
  "before": {
    "field_path": "expense.amount",
    "required": true
  },
  "after": {
    "field_path": "expense.amount",
    "required": false
  }
}
```

### 最大例（OPTIONAL を含む）

```json
{
  "evidence_shape": "data_contract.field_requiredness",
  "before": {
    "field_path": "expense.receipt_id",
    "required": true,
    "scope": "create",
    "note": "新規作成時のみ必須"
  },
  "after": {
    "field_path": "expense.receipt_id",
    "required": true,
    "scope": "create|edit",
    "note": "編集時も必須へ拡大"
  }
}
```

---

## 検証手順（推奨）

1. `decision_payload.semantic_domain` と `decision_payload.event` が **整合表**の行に存在するか確認する。
2. `decision_payload.evidence.evidence_shape` が、その行の許容値と一致するか確認する。
3. `evidence` オブジェクト全体を、手順2で選んだ **JSON Schema**（または `union.schema.json` の該当枝）で検証する。

---

## 変更履歴

- 2026-04-18: 初版。代表3 `evidence_shape`、案B表、JSON Schema、整合表を正本化（`T-20260418-007`）。
- 2026-04-18: ontology 正本パスを `docs/future/semantic/semantic-meaning-core-ontology-v0-ja.md` に合わせて更新（現行／将来ドキュメント分離）。
- 2026-04-18: JSON Schema を `docs/future/schemas/v2/evidence/` へ移動。本書内の相対リンクを `future/schemas/v2/evidence/` に更新。
