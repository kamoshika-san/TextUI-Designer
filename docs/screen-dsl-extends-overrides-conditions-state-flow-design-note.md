# 画面 DSL における `extends` / `overrides` / `conditions or permissions` / `state/flow` 設計ノート

## ステータス

- 状態: Architect design note
- 目的: 画面 DSL の再利用と条件表現を同じ仕組みに押し込めず、責務ごとに整理する
- 対象: 画面 DSL、将来の状態表現、権限制御、Navigation Flow との境界

## 背景

テーマ DSL には `extends` による継承があり、親テーマを deep merge して子テーマで上書きできる。
一方で画面 DSL は `page.components` を中心とする構造であり、再利用したい要求と、状態や権限によって UI を切り替えたい要求が同時に出やすい。

このとき、次の 2 つを同じ機構で扱うと設計が崩れやすい。

- 静的な再利用
- 実行時の条件分岐

本ノートでは画面 DSL の責務を 4 つの概念に分離する。

## 結論

画面 DSL では次の責務分離を採用するのが望ましい。

- `extends`: 静的なベース画面の再利用
- `overrides`: 継承先での局所的な上書き
- `conditions` または `permissions`: 実行時条件による表示・操作可否
- `state/flow`: 画面状態と遷移の表現

要点は次のとおり。

- `extends` は「何を土台に再利用するか」を表す
- `overrides` は「どこを差し替えるか」を表す
- `conditions` / `permissions` は「いつ・誰に効くか」を表す
- `state/flow` は「どう遷移するか」を表す

これらは似て見えても責務が異なるため、同一機構に統合しないほうが保守しやすい。

## 4 つの概念

### 1. `extends`

役割:

- ベース画面を継承して静的な重複を減らす

向いている用途:

- 共通レイアウト
- 共通フォーム骨格
- 文言や一部部品だけが異なる派生画面

向いていない用途:

- ログイン状態で変わる UI
- ロールごとに動的に変わる UI
- 遷移条件や業務状態の切り替え

設計原則:

- `extends` は静的な authoring-time 再利用に限定する
- 実行時条件は持ち込まない
- テーマ DSL のような単純 deep merge をそのまま流用しない

理由:

画面 DSL では `components` が配列であり、単純 deep merge では差分定義より全量再定義に寄りやすい。

### 2. `overrides`

役割:

- 継承元の特定要素だけを差し替える

向いている用途:

- タイトル差し替え
- 特定コンポーネントの props 差し替え
- コンポーネントの追加・削除・移動

設計原則:

- `overrides` は `extends` と組み合わせて使う
- 対象は位置ではなく安定 ID で指定する
- 配列全体置換ではなく、要素単位 patch を基本にする

推奨前提:

- `page.id` に加え、override 対象となるコンポーネントにも安定 ID を持たせる

### 3. `conditions` または `permissions`

役割:

- 表示条件と操作条件を実行時コンテキストに基づいて切り替える

想定例:

- `visibleWhen`
- `enabledWhen`
- `role`
- `permissions`
- `guard`

設計原則:

- これは継承ではなく runtime policy である
- `extends` とは独立したレイヤーとして持つ
- 誰に見えるか、いつ有効か、どの条件で押せるかを表す

理由:

- permission は「主体」に依存する
- condition は「実行時状態」に依存する
- 継承は「定義の再利用」に依存する

依存軸が異なるため、1 つの仕組みに混ぜると意味が曖昧になる。

### 4. `state/flow`

役割:

- 画面状態、状態遷移、画面間遷移を表す

想定例:

- 読み込み中、編集中、確認済み、送信済み
- タブ遷移
- モーダルの開閉
- 画面間フロー

設計原則:

- `state` は「今どの状態か」
- `flow` は「どこへどう遷移するか」
- 条件付き遷移やガードは Navigation 側と整合する語彙に寄せる

既存の Navigation Flow DSL には `policy`、`guard`、`terminal` があるため、画面 DSL 側でも同じ責務を継承機構へ押し込めない。

## なぜ 1 つにまとめないのか

次の 4 つの理由から、統一機構にしないほうがよい。

### 1. 派生爆発を防ぎたい

継承だけで状態や権限まで表そうとすると、次のような組み合わせ派生が増える。

- `base`
- `admin`
- `viewer`
- `submitted`
- `draft`
- `admin-submitted`
- `viewer-draft`

これは再利用より分岐爆発を招く。

### 2. 実行時条件を静的定義に埋め込みすぎない

`extends` は authoring-time に解決しやすいが、permission/state は runtime に解釈される。
解決タイミングが異なるため、同一メカニズムにすると検証・差分レビュー・デバッグが難しくなる。

### 3. diff とレビューの意味軸を保ちたい

既存の diff/summary 系では、permission と state は独立した意味軸として扱われる。
構造変更と permission 変更を同じ「継承差分」に潰すと、レビュー粒度が粗くなる。

### 4. マージ規則が不自然になる

テーマ継承の deep merge はオブジェクトに向くが、画面 DSL の中心はコンポーネント配列である。
そのため、画面 DSL では「継承」より「ID ベース override/pach」のほうが自然である。

## 推奨モデル

画面 DSL には次のレイヤー構成を推奨する。

1. ベース定義
2. 静的 override
3. 実行時条件
4. 状態と遷移

擬似イメージ:

```yaml
page:
  id: user-edit
  title: User Edit
  extends: ./base-user-form.tui.yml

  overrides:
    - target: page.title
      value: User Edit
    - target: component:submit-button
      props:
        label: Save Changes
    - target: component:admin-note
      action: add

  conditions:
    - target: component:admin-note
      visibleWhen:
        role: admin
    - target: component:submit-button
      enabledWhen:
        expression: form.isValid

  state:
    initial: editing
    modes:
      - id: editing
      - id: submitting
      - id: success

  flow:
    transitions:
      - from: editing
        to: submitting
        trigger: submit
      - from: submitting
        to: success
        trigger: resolved
```

## 導入順の推奨

段階導入する。

### Phase 1: `extends` + `overrides`

スコープ:

- 静的再利用のみ
- runtime condition は扱わない

Done 条件:

- ベース画面から派生画面を作れる
- 安定 ID ベースで override できる
- compile-time または load-time で deterministic に解決できる

### Phase 2: `conditions` / `permissions`

スコープ:

- `visibleWhen`
- `enabledWhen`
- `role` / `permissions`

Done 条件:

- Preview と Export の両方で意味が明確
- 差分レビューで condition 変更を独立検出できる

### Phase 3: `state/flow`

スコープ:

- 画面内部 state
- Navigation Flow DSL との接続

Done 条件:

- 遷移、ガード、状態切替が別責務として定義される
- Navigation の `guard` / `policy` と語彙衝突しない

## 非ゴール

このノートの非ゴールは次のとおり。

- テーマ DSL の merge 実装をそのまま画面 DSL に流用すること
- `extends` だけで permission/state を解決すること
- 画面 DSL と Navigation Flow DSL を 1 つの文書形式に統合すること
- Phase 1 で完全な runtime expression system まで入れること

## Architect 判断

採用したい判断:

- 画面 DSL の継承は導入候補として妥当
- ただし責務は static reuse に限定する
- permission/state は別レイヤーで表現する
- `overrides` は配列全置換ではなく ID ベース patch を採る

採らない判断:

- `extends` を状態管理機構として使う
- `extends` を権限制御機構として使う
- 画面バリエーションを role x state の組み合わせで大量派生させる

## 直近の次アクション

- 画面 DSL 向け `extends` / `overrides` の最小スキーマ案を作る
- override 対象に必要な安定 ID 方針を決める
- Preview / Export / Diff それぞれで必要な解決タイミングを整理する
- `conditions` / `permissions` の最小語彙を Navigation の `guard` と衝突しない形で定義する
