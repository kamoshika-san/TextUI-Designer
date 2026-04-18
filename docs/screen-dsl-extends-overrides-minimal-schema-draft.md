# 画面 DSL `extends` / `overrides` 最小スキーマ案

## ステータス

- 状態: Architect draft
- 目的: [screen-dsl-extends-overrides-conditions-state-flow-design-note.md](./screen-dsl-extends-overrides-conditions-state-flow-design-note.md) の Phase 1 を、実装とスキーマ設計に渡せる最小案へ落とし込む
- 対象: 画面 DSL の `extends` / `overrides`
- 非対象: `conditions` / `permissions` / `state` / `flow` の runtime layer

## この文書の前提

Phase 1 では、既存の `template` / `$include` を維持したまま、画面派生のための `extends` / `overrides` を追加する。

責務分離は次のとおり。

- `template`: 断片合成
- `extends`: ベース画面継承
- `overrides`: 継承後の局所差分

本案は「最小」であることを優先し、将来必要になりそうでも Phase 1 で必須でない機能は入れない。

## Phase 1 の目標

Phase 1 で実現したいことは次の 3 点である。

1. ベース画面から派生画面を定義できる
2. 差分を安定 ID ベースで記述できる
3. Preview / Export / Diff で deterministic に同じ解決結果を得られる

## 最小 DSL 形状

最小案として、`page` 配下に次の 2 フィールドを追加する。

```yaml
page:
  id: user-edit
  title: User Edit
  extends: ./base-user-form.tui.yml
  overrides:
    - target: page.title
      value: User Edit
```

### `page.extends`

- 型: `string`
- 意味: 継承元となるベース画面ファイルの相対パス
- 制約:
  - main screen DSL のみ参照可能
  - `.template.yml` は参照不可
  - 循環継承は不可
  - Phase 1 では単一継承のみ

### `page.overrides`

- 型: `array`
- 意味: 継承後の画面へ適用する静的差分
- 制約:
  - 適用順を持つため配列とする
  - 各要素は `target` と操作種別を持つ
  - 位置ベース指定は禁止

## `template` との境界

`extends` が参照できるのは、`page` を持つ main screen DSL のみとする。

採るルール:

- `page.extends` は `.tui.yml` など main document を参照する
- `$include.template` は `.template.yml` を参照する
- `.template.yml` は `extends` の親になれない
- `extends` 先の画面内部では従来どおり `$include` を使える

この制約により、断片合成と画面派生の shape を混同しない。

## 解決順序

Phase 1 の解決順序は次を推奨する。

1. `extends` 先の main screen DSL を読み込む
2. 親画面内の `$include` を解決する
3. 子画面側の `$include` を解決する
4. 親画面をベースに子画面を合成する
5. `overrides` を順番に適用する

運用上は「親子双方を静的に正規化してから patch 適用する」と考える。

## マージ方針

Phase 1 では deep merge を正規の意味論にしない。

採る方針:

- スカラーフィールドは明示 override のみで変更する
- 配列は要素単位 patch を基本にする
- オブジェクト全体 merge は必要最小限に留める

避ける方針:

- テーマ DSL と同じ deep merge をそのまま流用する
- `components` 配列を暗黙位置で自動 merge する
- 子画面が親画面の一部を再定義したら残りも推測 merge する

## 安定 ID ルール

`overrides` を成立させるため、画面内の差分対象には安定 ID が必要である。

### 必須 ID

- `page.id` は必須
- `overrides` の対象にしたいコンポーネントは安定 ID を持つ

### コンポーネント ID の最小案

Phase 1 の最小案として、各コンポーネント payload に共通 `id` を許可する。

例:

```yaml
- Button:
    id: submit-button
    kind: submit
    label: Save
```

この `id` は次の条件を満たす。

- 同一 page 内で一意
- authoring 時に明示的に付与
- Preview / Export / Diff で同じ identity として扱う

### なぜ path ではなく ID か

- 配列順変更に強い
- 断片展開後でも target が安定する
- diff の意味軸を保ちやすい

## `overrides` の最小演算

Phase 1 では、演算を絞る。

採用候補:

1. `set`
2. `merge-props`
3. `add`
4. `remove`

ただし最小スキーマとしては、文法を読みやすくするため `op` を省略可能にし、形から意味が決まる形を推奨する。

## `target` の最小語彙

`target` は文字列で表し、最初は少数の安定語彙だけに限定する。

採用候補:

- `page.title`
- `page.layout`
- `component:<id>`
- `component:<id>.props`

Phase 1 では、汎用 JSON Pointer よりも、限定された語彙のほうが安全である。

理由:

- 実装が単純
- エラーメッセージを出しやすい
- 将来の runtime layer と意味衝突しにくい

## override エントリ案

### 1. ページ値の差し替え

```yaml
overrides:
  - target: page.title
    value: User Edit
```

意味:

- `page.title` を完全置換する

### 2. コンポーネント props の部分差し替え

```yaml
overrides:
  - target: component:submit-button
    props:
      label: Save Changes
      kind: primary
```

意味:

- `component:submit-button` の props を shallow merge で更新する
- コンポーネント kind 自体は変えない

### 3. コンポーネント追加

```yaml
overrides:
  - target: component:form-actions
    action: addAfter
    component:
      Text:
        id: admin-note
        variant: caption
        value: Admin only note
```

意味:

- `form-actions` の直後へ新しい sibling component を追加する

### 4. コンポーネント削除

```yaml
overrides:
  - target: component:legacy-help
    action: remove
```

意味:

- 対象コンポーネントを削除する

## `add` 系操作の最小案

追加操作は自由度が高いため、Phase 1 では絞る。

採る案:

- `addBefore`
- `addAfter`
- `appendTo:<container-id>`

避ける案:

- 任意 path への挿入
- index 指定挿入
- 複数ノード同時追加

### なぜ `appendTo` を限定語彙にするか

`Container`、`Form.fields`、`Tabs.items[].components` など、配列の所有者が複数あるため、汎用 path よりも「どの親に追加するか」を安全に表したい。

ただし Phase 1 の実装を簡単にするなら、最初は `addBefore` / `addAfter` のみでもよい。

## 最小 JSON Schema イメージ

厳密な本番 schema ではなく、shape 合意用の擬似スキーマを示す。

```json
{
  "page": {
    "type": "object",
    "properties": {
      "extends": {
        "type": "string"
      },
      "overrides": {
        "type": "array",
        "items": {
          "oneOf": [
            {
              "type": "object",
              "required": ["target", "value"],
              "properties": {
                "target": { "enum": ["page.title", "page.layout"] },
                "value": {}
              },
              "additionalProperties": false
            },
            {
              "type": "object",
              "required": ["target", "props"],
              "properties": {
                "target": {
                  "type": "string",
                  "pattern": "^component:[A-Za-z0-9_.-]+$"
                },
                "props": {
                  "type": "object"
                }
              },
              "additionalProperties": false
            },
            {
              "type": "object",
              "required": ["target", "action"],
              "properties": {
                "target": {
                  "type": "string",
                  "pattern": "^component:[A-Za-z0-9_.-]+$"
                },
                "action": {
                  "enum": ["remove"]
                }
              },
              "additionalProperties": false
            }
          ]
        }
      }
    }
  }
}
```

この段階では、まず `page` 値置換、component props 更新、component 削除が入れば十分である。

## Phase 1 で入れないもの

次のものは将来候補とし、最小案から外す。

- 複数継承
- 条件付き override
- role / permission に応じた override 分岐
- state ごとの override 分岐
- 任意 JSON Pointer / JSON Patch
- コンポーネント kind の差し替え
- 複数 target への一括適用
- 参照式や expression による props 計算

## エラー契約の最小案

Phase 1 では、次のエラーを明確に返せることを優先する。

- 継承先ファイルが存在しない
- 継承先が main screen DSL ではない
- 循環継承を検出した
- target component ID が存在しない
- 同一 page 内で component ID が重複している
- `remove` 対象が必須構造を壊す

## Preview / Export / Diff との整合

Phase 1 では、各系統で別々の独自解決を持たせないほうがよい。

採るべき方針:

- `extends` / `overrides` の正規化器を 1 つに寄せる
- Preview / Export / Diff は正規化済み screen tree を入力に使う
- diff では「継承元を直接比較する」のではなく、「解決後 screen」を比較する

これにより、「Preview では見えるが Export では違う」「Diff が source shape を誤解する」といったズレを減らせる。

## 推奨する導入順

最小実装順は次を推奨する。

1. `page.extends` の読み込みと循環検出
2. 画面正規化フェーズの追加
3. `page.title` などページ値の override
4. `component:<id>` への props override
5. 必要なら `remove`
6. 必要が明確なら `addAfter` / `addBefore`

この順序なら、最初の価値を小さく出しつつ、配列 patch の難所を段階導入できる。

## Architect 判断

採用したい判断:

- `extends` は `page.extends: string` から始める
- `overrides` は `page.overrides: array` から始める
- target は限定語彙と安定 ID ベースにする
- 最初は deep merge ではなく明示 patch を正とする
- `template` との境界は file kind で明確に分ける

保留にしたい判断:

- `add` 系操作を Phase 1 に含めるか
- `component:<id>.props` のような target 詳細化を早期に入れるか
- 共通 `id` を schema 全 built-in へどう注入するか

## 直近の次アクション

- main screen DSL に `page.extends` / `page.overrides` を追加する schema 差分案を作る
- built-in 全体へ共通 `id` を入れる方法を決める
- 正規化器の責務を Preview / Export / Diff のどこに置くか設計する
- `remove` と `add` が配列所有者ごとに壊しうる制約を洗い出す
