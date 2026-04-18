# Semantic Meaning / Diff Taxonomy（業務意味の最小核）v0（日本語）

Updated: 2026-04-19  
Owner: Maintainer  
Status: Draft（概念語彙と比較原則の正本。compare-logic v2 の record 型は `docs/future/types/v2/diff-record.ts` を参照）

## 目的（この文書が固定すること）

TextUI Designer の文脈で、Semantic Diff と AI 実装入力を安定させるために必要な **「意味」** と、その **整理体系**、および **表現の最小形** を v0 として固定する。

この文書は次を目的とする。

- 正規化（canonicalization）可能な比較単位を定義する
- 仕様変更としての差分（Semantic Diff）を説明可能にする
- 実装へ渡す入力の核（プロンプト/チケット/仕様断片）を安定化する
- 再利用可能な業務 UI の共通語彙を、最初から広げすぎない

## 非目的（v0 でやらないこと）

- 全部入り DSL の設計
- デザイントークンやレイアウトの完全再現を目的とした記述
- 特定業務ドメインのロールや状態を網羅すること
- 実装コード（TypeScript の型定義）そのものの正本化
- 複数 screen をまたぐフロー比較（wizard / multi-step ナビゲーション等）の完全定義

## 用語: このツールでいう「意味」とは

ここでの **意味** は、画面の見た目・文言・フレームワーク都合の実装詳細ではなく、

> **業務として結果が変わり得る仕様情報**（正規化後に安定比較できる情報）

である。

典型例:

- どの操作が何を意味するか（操作の意味）
- 画面/データがどの状態にあるか（状態）
- 誰に許可されるか（権限）
- 見える・押せる・編集できるのか（可用性）
- 操作によって状態がどう遷移するか（遷移）

典型に含めない（多くは意味ではない）:

- ラベル文言の言い換え（同一操作・同一遷移・同一権限・同一可用性が保たれる場合）
- 配色・余白・フォント・微細なレイアウト
- 実装の書き方

## 用語: このツールでいう「差異」とは

### 包含関係（案A / `T-20260418-002`）

本書では次の **3層** を区別する（外ほど広い）。

1. **観測差分**（一次）: 生DSLまたは抽出IR上で検出される **変化**。`diff_event` があり、`layer` は `surface | structure | semantic` のいずれでもよい（観測のラベル）。
2. **差異**（本用語・**狭義**）: **業務意味に効く**不一致に限る。2つの仕様を同一 ontology（Action / State / Availability / Role / Transition）へ正規化したうえで、**業務として結果が変わり得る情報**について同値判定に失敗したもの。
3. **意味差分**: **差異**のうち、意味領域（`semantic domain`）や 5 軸で **説明・記録**される単位。**差異 ⊇ 意味差分**（1つの差異が複数の意味差分レコードに分割され得る）。

**1行定義（差異）**:

> **正規化後の ontology 比較において、業務として結果が変わり得る情報の不一致**

**1行定義（意味差分）**:

> **差異を意味領域・ontology 軸に沿って記録した単位（差異の説明子集合）**

定義式（運用表現）:

- `観測差分 ⊇ 差異`（`surface` にイベントがあっても、業務意味が同値なら差異に含めない）
- `差異 ⊇ 意味差分`

成立条件（**差異**として数える）:

- 正規化後の **Action / State / Availability / Role / Transition**（またはそれらから導かれる **業務結果**）のいずれかについて、対応要素の同値判定に失敗していること
- `surface` 上に `diff_event` があっても、上記がすべて同値なら **差異ではない**（観測差分のみ）

非該当（ノイズ）:

- 文言・見た目の変更があっても、正規化後に業務意味が同値なら **差異ではない**（意味差分でもない）

運用原則:

- **観測差分**はまず **機械的事実（`diff_event` / `layer`）** として記録する（論点3: 観測ラベルと「差異」判定は分離する）
- **差異**と **意味差分**は、正規化＋同値判定の **結果として**付与する（`diff_event` の有無だけで差異と断定しない）
- **意味差分**へ **解釈**（`semantic_domains` / 影響度 / 補助タグ）を載せる

### 表層（ラベル）変更は差異か（例 / `T-20260418-002`）

- **差異なし（多い）**: 語尾修正・同義語の置換などで、紐づく **操作の意味・遷移・権限・可用性**が正規化後に同値のまま変わらない場合。
- **差異あり（あり得る）**: 文言だけの差に見えても、利用者が取る **行動・誤認リスク・説明責任**が変わり、正規化後の Action / guard / Transition 等が **非同値**になる場合（例: 実質的に別操作の誘導になるラベル差し替え）。
- **境界（微妙）**: **文面差だけでは断定しない**。正規化ルールへ落とし、なお不確かなら **未解決**として保持する（扱いの詳細は `T-20260418-005`）。

## 用語: このツールでいう「正規化」とは

この文書での **正規化** は、次で定義する。

> **非正規（文言、表記揺れ、実装都合）な UI 仕様を、同一 ontology 上で比較可能な標準表現へ写像する処理**

目的:

- 同じ意味を同じ形へ畳む
- 異なる意味だけを差異として残す
- Semantic Diff と AI 実装入力の安定性を上げる

入出力契約（v0）:

- 入力: `raw DSL` / 自然言語仕様 / 画面定義断片
- 出力: `canonical DSL` + `stable reference` + `canonical predicate`

成立条件:

- **再現可能性**: 同一入力なら同一出力になる（決定的規則）
- **冪等性**: 正規化済み入力に再度正規化しても変化しない
- **比較可能性**: 出力が ontology の比較単位（Action / State / Availability / Role / Transition）へ落ちる

運用原則:

- 語彙変換は辞書の単純置換ではなく、候補化 + 制約検証で確定する
- 確定できない要素は推測確定せず、未解決として保持する
- 正規化は差分判定の前段で行い、判定後に生DSLへ戻さない

## canonical predicate（v0.1 / `T-20260418-003`）

guard や前提条件を **比較可能な JSON/YAML 片**に落とすための **閉じた**表現規約。実装パーサの正本ではなく、文書上の **最小契約**。

### 用語: `canonical predicate` とは

> **ontology 上の事実（`fact`）に対し、許容された `op` と値を組み合わせ、必要なら `all_of` / `any_of` / `not` で論理合成した、正規化済みの述語**

### `fact` の許容値（論点1＝**案A** / 最小閉包）

v0.1 で **`fact` に書いてよい文字列**は次に限る（それ以外は不正）。

| `fact` | 意味 | `value` の形（`eq` / `ne` / `in` 時） |
|--------|------|----------------------------------------|
| `role` | ロール軸 | 列挙子（`guest` … `admin` 等。`role.actors` に合わせる） |
| `entity_state` | 実体の業務状態 | 列挙子（`state.entity_state` に合わせる） |
| `availability` | 可用性の3軸まとめ | オブジェクト。**キー順固定**: `visibility` → `enabled` → `editability`。各値は `availability.*` の列挙子 |
| `action` | 操作の意味 | オブジェクト。**キー順固定**: `domain` → `type`。値は `action.domain` / `action.type` の閉じた木に合わせる |

### 演算子（論点2＝**案B** + **`in` の正規化＝案α**）

| `op` | 意味 | `value` |
|------|------|-----------|
| `eq` | 同値 | `fact` の型に合うスカラーまたはオブジェクト |
| `ne` | 非同値 | 同上 |
| `in` | 所属（集合） | **配列**。要素は **同一型のスカラー**（`role` / `entity_state` 向け）。正規形では **重複除去のうえ辞書順昇順**に並べ替える（案α）。`availability` / `action` では `in` を使わない |
| `exists` | 定義の有無 | **省略可**。`value` は使わない。スナップショット上に当該 `fact` が与えられている（null で埋めない）ことを表す |

`gt` / `lt` / `matches` 等は v0.1 では扱わない（`T-20260418-003` 非スコープ）。

### 論理合成（論点3）— わかりやすい意味と v0.1 既定

**日常語での対応**:

- **`all_of`**: 子たちを **全部満たす（AND）**。
- **`any_of`**: 子の **どれか1つでも満たせばよい（OR）**。
- **`not`**: 直後の1つを **満たさない（NOT）**。

**なぜルールが要るか**: AND/OR/NOT を入れ子にし放題にすると、人が読んでも機械が比較しても **同じ意味なのに形だけ違う**表現が増える。v0.1 では次の **既定**で木を絞る。

v0.1 既定（追加の設計選択）:

- **深さ**: 根から数えて **最大 4**（根の `all_of` / `any_of` / `not` を深さ1とする）。
- **空配列禁止**: `all_of: []` / `any_of: []` は不正（「条件なし」と「書き忘れ」を区別するため）。
- **単子の畳み込み**: `all_of: [p]` および `any_of: [p]` は **正規形では `p` に畳む**（無駄な一段を残さない）。
- **`not` の直下**: **atomic 1件**、または **`all_of` / `any_of` ちょうど1つ**のみ（`not` の多重は内側から解消して深さ制限内に収める）。

### 未解決（論点4＝**案A**）

述語が確定できないときは、次の **オブジェクト1形**を **リーフ**として置く（通常の `{ fact, op, value }` と置き換え）。

```yaml
kind: unresolved
reason: 人手で確定が必要な理由（短文）
candidates: [] # 任意。候補があるときだけ列挙
```

**推測で埋めない**（`reason` だけで済ませて値を捏造しない）。`candidates` は **文字列の配列のみ**とし、正規形では **重複除去のうえ辞書順昇順**、**最大 8 件**（`T-20260418-005` 合意）。下流の扱いの正本は次節。

### 決定性（論点5＝**案A**）

v0.1 で言う **「同一入力 → 同一 predicate」** の「入力」とは、**正規化パイプラインに入る前から DSL 上で `fact` 参照が確定している断片**を指す。**自然言語だけ**を入力にした場合の決定性は本節の正本に含めない（別プロセスで DSL 化してから本節を適用する）。

### 例（`in` の正規化）

```yaml
# 入力（非正規）
- { fact: role, op: in, value: [approver, guest, approver] }
# 正規形（案α）
- { fact: role, op: in, value: [approver, guest] }
```

### 例（`exists`）

```yaml
- { fact: availability, op: exists }
```

### 例（未解決を残す）

```yaml
# before: 条件が確定しない
guard:
  kind: unresolved
  reason: ロール条件の原文が二義性
  candidates: [guest, user]

# after: 推測で確定せず据え置き（運用で人手確定まで待つ）
guard:
  kind: unresolved
  reason: ロール条件の原文が二義性
  candidates: [guest, user]
```

## 未解決要素の扱い（`T-20260418-005`）

正規化で **述語が確定しない**ときの保持形式、比較・説明・ライフサイクルの **運用正本**（`canonical predicate` の `kind: unresolved` と一体で読む）。

### 合意済み（2026-04-18）

| 論点 | 採用案 |
|------|--------|
| スキーマ境界 | **案A**（`T-003` の形を正本のまま）＋ **`candidates` は案α**（文字列配列・正規化・最大8件） |
| diff 判定 | **片側のみ未解決＝案B**、**両側未解決＝案C**、**v2 接続＝案ⅱ** |
| compare-logic v2 の review_status | `approved` / `rejected` / `needs_review` |
| Human-readable | **案B**（禁止語＋推奨テンプレ1本） |
| ライフサイクル | **案A**（人手確定まで据え置き） |

### `review_status`（compare-logic v2 の機械ラベル）

| 値 | 意味 |
|----|------|
| `approved` | 比較結果が決定論的、または追加レビューなしで扱える |
| `needs_review` | 比較は完結したが、補助キーや未解決述語を含むため人手確認が必要 |
| `rejected` | 人手レビューで差し戻された結果を保持するための状態 |

### diff 判定（述語に未解決が含まれる場合）

- **片側だけ**が `kind: unresolved`（他方は確定述語）のとき: compare-logic v2 では `component_guard_changed` を生成し、`review_status: needs_review` とする。
- **両側**が未解決リーフのみ／未解決が同じスロットに対応するとき: `kind` / `reason` / `candidates`（正規化後）が **すべて同一**なら **述語として同値**。いずれかが異なれば **非同値**とし、`needs_review` を付与する。
- **v2 との境界**: 未解決述語を含む差分レコードは `confidence` を低めに抑え、`ambiguity_reason` を条件付き必須とする。compare-logic v2 では閾値 `0.8` 未満を `needs_review` とする。

### Human-readable（注意喚起）

**避ける語（例・非網羅）**: 「確定」「必ず」「差異なし」「誤りなく」「保証」。

**推奨テンプレ（例）**:

> 未確定（理由: {reason}）候補: {candidates} — 人手確認が必要。

（UI の体裁・色・コンポーネントは非スコープ。）

### ライフサイクル

- 未解決は **人手で述語が確定するまで据え置き**とする。
- **再正規化**は、対象 DSL の更新、または **明示的リラン**が行われたときに限る（自動学習による解消は扱わない）。

## 用語: このツールでいう「ontology」とは

この文書での **ontology** は、次で定義する。

> **UI 仕様を意味単位で表現・比較・推論するための概念体系（語彙、関係、制約）の最小共通モデル**

構成要素:

- `concept`: Action / State / Availability / Role / Transition
- `relation`: trigger, from, to, guard など概念間の関係
- `constraint`: 許容値、整合条件、同値判定規則

役割:

- 入力表記の揺れを吸収し、正規化先を固定する
- Semantic Diff の比較基盤を提供する
- AI 実装入力の共通土台として機能する

境界（含めないもの）:

- 文言、レイアウト、スタイルなどの表層表現
- フレームワーク固有の実装詳細
- 業務意味に関与しない記述上の都合

## 体系（2段階モデル）

### A. 抽象度レイヤ（diff の観測レイヤ）

議論上の整理として、差分は次の階段で扱う。

- **表層（surface）**: 文言・装飾など。仕様核が不変になりやすい。
- **構造（structure）**: 画面/フォームの骨格、項目の有無、遷移の形など。
- **意味（semantic）**: 業務結果が変わり得る（到達可能状態、保存データ、許可集合、副作用）。

注意:

- 3語は **同じ抽象度の階段** として並べる。
- 「挙動」はこの階段と同列に置かない（後述）。

### B. 意味領域（semantic domain）

`semantic` に入った変更が **どの種類の仕様変更か** を説明するためのタグ集合。

v0 の推奨セット:

- **状態機械（state_machine）**: 状態集合、遷移、終端、ガード付き遷移
- **権限（authorization）**: ロール条件、許可集合
- **データ契約（data_contract）**: 入力/保存項目、必須、型、列挙、デフォルト
- **連携（integration）**: 外部 I/O、失敗時扱い、再送など（必要になったら）
- **非機能（non_functional）**: 性能、可用性、監査ログ粒度など（必要になったら）

ルール:

- 1変更に **複数 domain タグ** が付いてよい（現実の変更は横断的になりやすい）。
- タグ数は運用のため **最大 3** まで（超えるなら分割して別 diff イベントにする）。

### C. 現象タグ（phenomenon）

ユーザー観測としての現象（ナビゲーション、待ち、バリデーションタイミング等）。

ルール:

- `semantic domain` と同列の「意味の内訳」にはしない。
- 必要なら **補助タグ** として付ける。

## 最小コア ontology（v0 / 5軸）

v0 の ontology は、まず次の 5 軸に限定する（増殖を避けるため閉じた語彙で持つ）。

1. **Action（操作の意味）**
2. **State（状態）**
3. **Availability（可用性: 可視・活性・編集可否）**
4. **Role（権限の最小軸）**
5. **Transition（状態遷移）**

### Action（閉じた木）

UI 操作の意味を **表層文言ではなく木** で表す。

```yaml
action:
  domain: [persist, workflow, navigate, mutate, system]
  type:
    persist: [create, update, save_draft]
    workflow: [submit, approve, reject, cancel]
    navigate: [open, back, next, close]
    mutate: [add, remove, reorder]
    system: [search, filter, sort, export, import]
```

### State（混ぜない）

業務 UI では状態が肥大化しやすいので、最低限次の分離を維持する。

```yaml
state:
  entity_state: [new, draft, editing, submitted, approved, rejected, archived]
  view_state: [loading, empty, ready, error]
  interaction_state: [idle, dirty, validating, saving]
```

### Availability（可用性）

「見えるか」「押せるか」「編集できるか」を分離する。

```yaml
availability:
  visibility: [visible, hidden]
  enabled: [enabled, disabled]
  editability: [editable, readonly]
```

### Role（粗い開始点）

```yaml
role:
  actors: [guest, user, operator, approver, admin]
```

### Transition（Semantic Diff を強くする核）

「ボタンがある」ではなく **操作で何がどう変わるか** を表す。

```yaml
transition:
  - trigger: { domain: workflow, type: submit }
    from: draft
    to: submitted
```

補足: `transitions[].id` が Transition の **安定参照キー**（同一性判定・rename 判定に使用）。DSL サンプルでは `id: t_submit_draft_to_submitted` のように付与する。

## DSL 構造概念（5軸の適用スコープ）

5軸（Action / State / Availability / Role / Transition）の述語・状態は、以下の **構造概念** を対象スコープとして適用する。構造概念は ontology の軸ではなく、DSL の **比較・参照の単位** として機能する。

| 概念 | 役割 | 安定参照キー |
|------|------|-------------|
| `screen` | entity と components を束ねる比較・正規化の最上位単位 | `screen`（DSL トップキー） |
| `entity` | 業務操作の対象となる主体。5軸はこの entity に対して評価される | `entity.id` |
| `components` | screen 内の UI 要素集合。Action / Availability の述語が適用される単位 | `components[].id` |

### screen

> **screen**: entity + components + transitions を束ねた、正規化・比較の **最上位単位**。`screen` 識別子（DSL トップキー）が安定参照の起点となる。

- compare-logic v2 の現行スコープでは 1 screen = 1 entity とする。複数 entity は将来拡張の説明であり、現行比較ロジックでは非スコープ。
- screen 内の stable reference（`entity.id` / `components[].id` / `transitions[].id`）は screen スコープ内で一意でなければならない

### entity

> **entity**: screen の主体となる業務オブジェクト（例: 申請書・注文・ユーザー）。5軸は entity の状態・操作・権限・可用性を記述するために使う。

フィールド:

- `id`: 安定参照キー（主キー。規則の詳細は「安定参照と entity 同一性規則」節を参照）
- `name`: 人間可読ラベル（意味の主キーではない）
- `state`: 業務状態（`state.entity_state` の列挙子に対応）

### components

> **components**: screen 内の UI 要素集合。各要素は `id`（安定参照キー）を持ち、Action / Availability の述語が適用される単位となる。

フィールド（各 component）:

- `id`: 安定参照キー（`components[].id` として stable reference に使用）
- `type`: UI 要素の種別（`button` / `input` 等。v0 では閉じた列挙を定義しない）
- `label`: 人間可読ラベル（意味の主キーではない）
- `action` / `availability` / `guard`: 5軸の述語を適用するフィールド

## 表現（正規化 DSL の最小断片）

比較可能性を上げるため、条件は正規形（predicate）へ落とすことを推奨する（**構文の正本**は上記「`canonical predicate`（v0.1）」節）。

```yaml
screen: expense_detail

entity:
  id: expense          # 主キー（stable reference）
  name: 経費申請
  state: draft

components:
  - id: submit_button
    type: button
    label: 申請
    action: { domain: workflow, type: submit }
    availability: { visibility: visible, enabled: enabled, editability: readonly }
    guard:
      all_of:
        - { fact: role, op: eq, value: user }
        - { fact: entity_state, op: eq, value: draft }

transitions:
  - id: t_submit_draft_to_submitted
    trigger: { domain: workflow, type: submit }
    from: draft
    to: submitted
```

補足:

- `label` は人間可読の表示メタデータであり、**意味の主キーではない**。
- 比較の主キーは `screen` / `entity.id` / `components[].id` / `transitions[].id` などの **安定参照**。

## 安定参照と entity 同一性規則（`T-20260418-004`）

### 安定参照の定義

> **主キー（stable reference）**: 正規化後も変わらない識別子。主キーが変わった場合に限って「別要素への変更」と判定する。

### entity の主キー規則

`entity` の同一性は次の **優先順** で確定する。

| 優先 | 規則 | 判定 |
|------|------|------|
| 1 | `entity.id` が両版に存在し **一致** | 同一 entity。`name` 変化は **rename** として扱う |
| 2 | `entity.id` が両版に存在し **不一致** | 別 entity（**remove + add**） |
| 3 | `entity.id` が片側のみ | `entity.id` がある版を優先し補助規則で照合 |
| 4 | `entity.id` が両版に **存在しない** | `entity.name` で照合する（補助規則） |

**補助規則（`entity.id` 不在時）:**
- `entity.name` が一致 → 同一 entity（`confidence: 0.7`, `review_status: needs_review` を付与）
- `entity.name` も不一致 → 別 entity（remove + add）

**制約:**
- `entity.id` は同一 screen スコープ内で一意でなければならない
- `entity.id` が存在する場合、`entity.name` の変化だけでは remove + add と判定しない

### rename 判定の規則

| 条件 | 判定 | `diff_event` 例 |
|------|------|-----------------|
| 主キー一致・`name` 変化のみ | **rename**（差異の候補。業務意味が同値なら差異ではない） | `entity_renamed` |
| 主キー不一致（または補助規則で非同定） | **remove + add**（別 entity） | `entity_removed` + `entity_added` |
| 主キー一致・`name` 変化 ＋ 業務状態変化 | rename かつ差異あり（要確認） | `entity_renamed` + 別イベント |

**rename と差異の関係:**
- rename 単体（`name` のみ変化、業務結果が同値）は **「差異」の成立条件を満たさない**ことが多い。
- ただし `name` が Action / Availability 等に実質影響する場合は差異となり得る。
- 判断できない場合は **`review_status: needs_review`** とし、人手確認へ回す。

### entity 主キーを含む DSL サンプル

```yaml
# 変更前
entity:
  id: expense
  name: 経費申請
  state: draft

# rename の例（id 一致・name 変化 → entity_renamed。業務状態同値なら差異なし）
entity:
  id: expense          # 主キー一致 → 同一 entity
  name: 支出申請       # name 変化 → rename 候補
  state: draft

# remove + add の例（id 不一致 → 別 entity）
entity:
  id: expense_v2       # 主キー不一致 → entity_removed + entity_added
  name: 経費申請
  state: draft
```

## Semantic Diff 出力（推奨レコード形）

マトリックス（domain × layer）を一次データにすると、空セルや多重割当で運用が壊れやすい。

推奨は **イベント列挙 + タグ付け**。

```yaml
diff:
  id: d1
  event: transition_edge_changed
  layer: semantic
  semantic_domains: [state_machine]
  phenomena: [navigation]
  evidence:
    before: { from: draft, to: submitted, trigger: { domain: workflow, type: submit } }
    after: { from: draft, to: rejected, trigger: { domain: workflow, type: reject } }
```

ルール（v0）:

- `event` は機械的に出せる差分種別（一次事実）
- `layer` は原則 **主に 1 つ**（迷ったら `structure` に落としてから昇格）
- `layer: semantic` なら `evidence` を可能な限り添える
- 上記の `event` / `layer` は **観測差分** のラベル。本書の **差異**・**意味差分** は正規化後の判定として別途付与する（`T-20260418-002`）

### diff_event 語彙（v0 推奨セット）

`diff_event` は観測差分の **機械ラベル**（一次事実）。v0 では次の推奨セットを使う（拡張可能だが、新規 event は本表に追記してから使う）。

| `diff_event` | 意味 | 推奨 `layer` |
|--------------|------|-------------|
| **entity 系** | | |
| `entity_added` | entity が追加された | `structure` |
| `entity_removed` | entity が削除された | `structure` |
| `entity_renamed` | entity の `name` が変化した（`id` は同一） | `surface` |
| `entity_state_changed` | entity の `state`（業務状態）が変化した | `semantic` |
| **transition 系** | | |
| `transition_added` | Transition が追加された | `structure` |
| `transition_removed` | Transition が削除された | `structure` |
| `transition_edge_changed` | Transition の `from` / `to` / `trigger` が変化した | `semantic` |
| **component 系** | | |
| `component_added` | component が追加された | `structure` |
| `component_removed` | component が削除された | `structure` |
| `component_action_changed` | component の `action`（domain/type）が変化した | `semantic` |
| `component_availability_changed` | component の `availability` が変化した | `semantic` |
| `component_guard_changed` | component の `guard`（述語）が変化した | `semantic` |

補足:

- `layer: surface` は業務意味への影響が低い変化（rename 等）の観測ラベル。差異判定は正規化後に行う。
- `layer: semantic` の `diff_event` には `evidence` を添えることを推奨（`T-20260418-007`）。
- 上表にない `diff_event` は `layer: structure` に落としてから必要なら昇格させる（ルールと同じ）。

## 既存ドキュメントとの関係（重要）

本リポジトリの Semantic Diff MVP 契約は `docs/diff-semantic-mvp-contract-and-ir.md` が正本であり、

- `layer` は `structure | behavior | visual | data`（実装・レビュー向けの分類）

本書はそれとは別に、

- `surface | structure | semantic`（業務仕様の抽象度の階段）
- `semantic domain`（意味領域タグ）
- 5軸 ontology（業務意味の最小核）

を固定する。

衝突を避けるための対応関係（運用上の目安）:

- MVP の `visual` ≈ 本書の `surface`（ただし MVP は実装レイヤ語彙）
- MVP の `structure` ≈ 本書の `structure`
- MVP の `behavior` / `data` は、本書の `semantic` に入った後 **`semantic_domains` で再分類**する

## v2方針決定（2026-04-18）

`T-20260418-001` の決定として、Semantic Diff は **v1 系と v2 系を分離**して扱う。

- `v1` 判定語彙の正本: `docs/diff-semantic-mvp-contract-and-ir.md`
- `v2` 判定語彙の正本: `docs/future/semantic/semantic-meaning-core-ontology-v0-ja.md`（本書）
- `v2` では概念語彙（本書で定義する語彙）を **説明用ではなく判定ロジック本体**として扱う
- `v2` は `v1` と **非互換（breaking change）** とし、v1 への写像規則は定義しない
- 差分の記録形式（論点4）は別チケット `T-20260418-006` で継続定義する

補足:

- 上記「対応関係（運用上の目安）」は **v1 系の理解補助**としてのみ扱う。
- `v2` 判定では、互換目的のレイヤ写像を前提にしない。

## compare-logic v2 の現行レコード契約

compare-logic v2 の **コード寄り正本**は `docs/future/types/v2/diff-record.ts` とする。本書は概念語彙・境界・運用ルールを固定し、具体的な record 形は型断片側へ委譲する。

### 現行の責務分担

- `V2DiffRecord`: `decision` と `explanation` を完全分離した compare-logic v2 の最小単位
- `DecisionPayload`: `diff_event`, `target_id`, `confidence`, `ambiguity_reason?`, `review_status?`
- `ExplanationPayload`: `evidence: EvidenceShape[]`, `canonical_predicate?`
- `DiffCompareResult.v2`: `V2ScreenDiff[]` を収録する provider 返却形（詳細は設計H）

### 運用ルール

- compare-logic v2 の機械判定は `decision` を基準に行う
- `explanation.evidence` は **空配列を許容**する。registry 登録済み `evidence_shape` がある場合だけ各要素を `docs/v2-evidence-shapes-registry-ja.md` と JSON Schema で検証する
- `canonical_predicate` は evidence 未登録イベントや predicate 系差分の説明に使う
- `confidence` は 0.0–1.0 の確信度とし、compare-logic v2 では `0.8` 未満を `needs_review` とする

### 歴史的メモ

- `T-20260418-006` で議論した `decision_payload` / `explanation_payload` 形式は compare-logic v2 の背景メモとして残すが、現行の record 形そのものの正本ではない
- compare-logic v2 実装・レビューでは `docs/future/types/v2/diff-record.ts`、設計E/F/H、`docs/v2-evidence-shapes-registry-ja.md` を優先する

## 変更履歴

- 2026-04-18: v0 初版（議論の固定化）
- 2026-04-18: 「差異」の定義（成立条件・非該当・運用原則）を追加
- 2026-04-18: 「正規化」の定義（目的・入出力契約・成立条件・運用原則）を追加
- 2026-04-18: 「ontology」の定義（構成要素・役割・境界）を追加
- 2026-04-18: `T-20260418-001` 決定を反映（v1/v2正本分離、v2非互換、記録形式は `T-20260418-006` へ分離）
- 2026-04-18: `T-20260418-006` 合意を反映（論点1=案B、論点2=案A、判定/説明の完全分離、最小JSON例）
- 2026-04-18: 論点3（`evidence` 内部の正規形粒度）を `T-20260418-007` に切り出し追跡する旨を追記
- 2026-04-18: `T-20260418-007` 方針決定を反映（証拠は案C＝`evidence_shape` を検証正本、案B＝表の階層構造。`evidence_shape` を MUST に追加し最小JSON例を更新）
- 2026-04-18: `T-20260418-007` 正本化 — `docs/v2-evidence-shapes-registry-ja.md` と `docs/future/schemas/v2/evidence/` を追加し、本書の論点3から参照
- 2026-04-18: 現行／将来ドキュメント分離のため `docs/future/semantic/` へ移動（旧 `docs/semantic-meaning-core-ontology-v0-ja.md` はリダイレクト用スタブ）
- 2026-04-18: v2 証拠 JSON Schema を `docs/future/schemas/v2/evidence/` へ移動（論点3の検証正本の置き場を将来トラックに統一）
- 2026-04-18: `T-20260418-003` — `canonical predicate` v0.1（fact 案A、演算子案B+`in`案α、論理合成の平易説明と既定、未解決案A、決定性案A）
- 2026-04-18: `T-20260418-002` 反映 — 差異＝業務意味に効く不一致（狭義）、案A包含（観測差分 ⊇ 差異 ⊇ 意味差分）、観測と判定の分離、表層ラベル例
- 2026-04-18: `T-20260418-005` — 未解決の `candidates` 正規化、`review_status`、diff 規則、Human-readable、ライフサイクル、v2 境界1行
- 2026-04-18: `T-20260418-004` — 安定参照と entity 同一性規則を追加（主キー規則・rename 判定・サンプル）。サンプル DSL の `entity` に `id` フィールドを追加
- 2026-04-18: Architect 検証による即修正 — サンプル DSL の `entity.name` を `経費申請`（日本語）に統一。JSON 例の `confidence` 数値に閾値非規定の注記を追加
- 2026-04-18: `T-20260418-008` — DSL 構造概念（screen / entity / components）を「5軸の適用スコープ」として定義追加。Transition 節に `transitions[].id` の安定参照キー記述を追加
- 2026-04-18: `T-20260418-009` — `diff_event` v0 推奨語彙表を追加（entity 系4件・transition 系3件・component 系5件、`layer` 推奨付き）
- 2026-04-18: `T-20260418-010` — `confidence` の意味・値域（0.0–1.0・確信度）および `ambiguity_reason` の記述形式（自由文・短文）を `decision_payload` 節に追記
- 2026-04-18: `T-20260418-011` — 非目的節に multi-screen フロー比較が v0 スコープ外である旨を追記
- 2026-04-19: `T-20260419-001` — compare-logic v2 の現行 record 契約を `docs/future/types/v2/diff-record.ts` 基準へ一本化し、本書は概念・運用ルールへ整理
- 2026-04-19: `T-20260419-002` — 未解決述語の比較規則と `review_status` を `needs_review` 基準へ統一
- 2026-04-19: `T-20260419-003` — evidence は `explanation.evidence[*]` を検証対象とし、空配列許容・registry 適用条件を明文化
- 2026-04-19: `T-20260419-004` — layer 語彙と `entity_renamed` の観測レイヤ整理を compare-logic v2 設計と整合
- 2026-04-19: `T-20260419-005` — compare-logic v2 の単一 entity 前提と `entity.id` 欠損時の補助照合規則を明文化
