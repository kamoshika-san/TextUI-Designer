# 画面 DSL における `template` / `extends` / `overrides` / `conditions or permissions` / `state/flow` 設計ノート

## ステータス

- 状態: Architect design note
- 目的: 画面 DSL の再利用、差分適用、実行時条件、状態遷移を責務ごとに整理し、将来の実装と利用シーンで混乱しない設計原則を定める
- 対象: 画面 DSL、既存の `template` / `$include`、将来の状態表現、権限制御、Navigation Flow との境界

## 背景

テーマ DSL には `extends` による継承があり、親テーマを deep merge して子テーマで上書きできる。
一方で画面 DSL にはすでに `template` / `$include` による再利用が存在し、複数ファイルへ分割した UI 断片を `params` 付きで静的に展開できる。

このとき、画面 DSL では少なくとも次の 3 種類の要求が同時に現れやすい。

- 共通 UI 断片を再利用したい
- ベース画面から派生画面を作りたい
- 状態や権限に応じて UI を切り替えたい

これらをすべて 1 つの仕組みに押し込むと、設計が崩れやすい。

- 静的な断片再利用
- 静的な画面派生
- 実行時の条件分岐

本ノートでは、画面 DSL の責務を 5 つの概念に分離する。

## 結論

画面 DSL では次の責務分離を採用するのが望ましい。

- `template`: 画面内へ差し込む UI 断片の静的再利用
- `extends`: ベース画面の静的再利用
- `overrides`: 継承先での局所的な上書き
- `conditions` または `permissions`: 実行時条件による表示・操作可否
- `state/flow`: 画面状態と遷移の表現

要点は次のとおり。

- `template` は「何を部品として組み込むか」を表す
- `extends` は「何を画面の土台にするか」を表す
- `overrides` は「継承先でどこを差し替えるか」を表す
- `conditions` / `permissions` は「いつ・誰に効くか」を表す
- `state/flow` は「どう遷移するか」を表す

これらはすべて再利用や切替に見えるが、責務と解決タイミングが異なるため、同一機構に統合しないほうが保守しやすい。

## 用語整理

### `template`

既存の `template` / `$include` は、`page.components` などに差し込む UI 断片を別ファイル化し、`params` を与えて静的展開する仕組みとして扱う。

- 単位: 部品、部分レイアウト、繰り返し使うコンポーネント群
- 主な形: `.template.yml`
- 解決タイミング: authoring-time / load-time の静的展開
- 主な目的: 画面の組み立て

これは「親画面を継承する」仕組みではなく、「画面の中に断片を差し込む」仕組みである。

### `extends`

`extends` は、ある画面を別のベース画面から派生させる仕組みとして扱う。

- 単位: ページ、画面、フォーム全体
- 解決タイミング: authoring-time / load-time の静的解決
- 主な目的: 画面の派生

これは「画面全体の骨格再利用」であり、既存の `template` と競合する概念ではなく、再利用の粒度が異なる概念である。

## 5 つの概念

### 1. `template`

役割:

- UI 断片を分割し、画面内へ静的に差し込む

向いている用途:

- 共通ヘッダー
- 共通サイドバー
- 共通フォーム断片
- タブ内の繰り返しブロック

向いていない用途:

- 画面全体の派生
- 派生画面ごとの差分管理
- 実行時の表示切替

設計原則:

- `template` は部品レベルの静的再利用に限定する
- `params` は断片組み立てのための値差し替えに限定する
- `template` を親画面継承の代替として使わない

理由:

既存の `template` は断片をインライン展開する仕組みであり、画面単位の継承差分やレビュー粒度を扱うには責務が軽すぎる。

### 2. `extends`

役割:

- ベース画面を継承して静的な重複を減らす

向いている用途:

- 共通レイアウトを持つ派生画面
- 共通フォーム骨格を持つ登録画面と編集画面
- 文言や一部部品だけが異なる派生画面

向いていない用途:

- ログイン状態で変わる UI
- ロールごとに動的に変わる UI
- 遷移条件や業務状態の切り替え

設計原則:

- `extends` は静的な authoring-time 再利用に限定する
- 実行時条件は持ち込まない
- テーマ DSL のような単純 deep merge をそのまま流用しない
- `template` と競合させず、「画面派生」の責務に限定する

理由:

画面 DSL では `components` が配列であり、単純 deep merge では差分定義より全量再定義に寄りやすい。
また、`template` と `extends` を同一化すると、断片組み立てと画面派生が同じ語彙になり、利用者にとって概念が曖昧になる。

### 3. `overrides`

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
- `template` の params 差し替えと、`overrides` の派生差分を混同しない

推奨前提:

- `page.id` に加え、override 対象となるコンポーネントにも安定 ID を持たせる

### 4. `conditions` または `permissions`

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
- `template` / `extends` / `overrides` とは独立したレイヤーとして持つ
- 誰に見えるか、いつ有効か、どの条件で押せるかを表す

理由:

- permission は「主体」に依存する
- condition は「実行時状態」に依存する
- `template` / `extends` / `overrides` は「定義の再利用」に依存する

依存軸が異なるため、1 つの仕組みに混ぜると意味が曖昧になる。

### 5. `state/flow`

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
- `state/flow` は再利用機構ではなく、画面の振る舞い記述として扱う

既存の Navigation Flow DSL には `policy`、`guard`、`terminal` があるため、画面 DSL 側でも同じ責務を継承機構へ押し込めない。

## 静的再利用は 2 層に分ける

画面 DSL の静的再利用は、1 つの概念ではなく次の 2 層に分けるのが望ましい。

### 下位層: `template` による断片合成

- 目的: 部品や部分レイアウトの共通化
- 粒度: コンポーネント群
- 主な操作: `$include` と `params`
- 典型例: ヘッダー、サイドバー、タブの内容、フォーム断片

### 上位層: `extends` + `overrides` による画面派生

- 目的: 画面全体の骨格再利用
- 粒度: 1 画面
- 主な操作: ベース画面継承と安定 ID ベース差分
- 典型例: 登録画面から編集画面を派生、共通ダッシュボードからロール別派生画面を生成

この 2 層を分けることで、次の整理が可能になる。

- `template`: 組み立て
- `extends`: 派生
- `overrides`: 差分
- `conditions` / `permissions`: 実行時ポリシー
- `state/flow`: 実行時振る舞い

## なぜ 1 つにまとめないのか

次の 5 つの理由から、統一機構にしないほうがよい。

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

### 2. 断片組み立てと画面派生を分けたい

`template` は「中身を差し込む」概念であり、`extends` は「土台から派生する」概念である。
両者を 1 つにすると、同じ静的再利用でも粒度が違うことが隠れてしまう。

### 3. 実行時条件を静的定義に埋め込みすぎない

`template` / `extends` は authoring-time に解決しやすいが、permission/state は runtime に解釈される。
解決タイミングが異なるため、同一メカニズムにすると検証・差分レビュー・デバッグが難しくなる。

### 4. diff とレビューの意味軸を保ちたい

既存の diff/summary 系では、permission と state は独立した意味軸として扱われる。
また、断片再利用の変更と画面派生差分の変更も、本来は別のレビュー対象である。
構造変更、派生差分、permission 変更を同じ「継承差分」に潰すと、レビュー粒度が粗くなる。

### 5. マージ規則が不自然になる

テーマ継承の deep merge はオブジェクトに向くが、画面 DSL の中心はコンポーネント配列である。
そのため、画面 DSL では「継承」より「ID ベース override/patch」のほうが自然である。
さらに、既存の `template` はインライン展開型であり、親画面 merge の文法として流用すると形が不自然になる。

## 推奨モデル

画面 DSL には次のレイヤー構成を推奨する。

1. `template` による断片展開
2. ベース画面定義
3. `extends` による画面継承
4. `overrides` による静的差分適用
5. 実行時条件
6. 状態と遷移

要するに、静的再利用の中でも「断片展開」と「画面派生」を分ける。

## 推奨する解決順序

Preview / Export / Diff の整合を保つため、概念上の解決順序は次の順を推奨する。

1. `$include` を解決して `template` を展開する
2. `extends` によって親画面を読み込む
3. `overrides` を安定 ID ベースで適用する
4. 正規化済み DSL に対して `conditions` / `permissions` を評価する
5. その上で `state/flow` を解釈する

この順序にすると、次の意味分離が保ちやすい。

- template 変更: 断片構成の変更
- override 変更: 派生差分の変更
- conditions / permissions 変更: 実行時ポリシーの変更
- state / flow 変更: 実行時振る舞いの変更

## 擬似イメージ

```yaml
page:
  id: user-edit
  title: User Edit
  extends: ./base-user-form.tui.yml

  components:
    - $include:
        template: ./templates/form-header.template.yml
        params:
          title: User Edit

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

## 設計ルール

採用したいルール:

- `template` は断片再利用の語彙として維持する
- `extends` は画面派生の語彙として導入する
- `overrides` は配列全置換ではなく ID ベース patch を採る
- permission/state は別レイヤーで表現する
- Preview / Export / Diff で同じ意味順序で扱えるようにする

採らないルール:

- `template` をそのまま親画面継承に使う
- `extends` を `template` の上位互換として 1 本化する
- `extends` を状態管理機構として使う
- `extends` を権限制御機構として使う
- 画面バリエーションを role x state の組み合わせで大量派生させる

## 利用シーンごとの整理

### 利用者が `template` を選ぶ場面

- ページ内の一部を別ファイルへ切り出したい
- 同じ UI 断片を複数画面で再利用したい
- 差分は `params` で十分であり、派生差分として管理する必要はない

### 利用者が `extends` を選ぶ場面

- ベース画面から派生画面を作りたい
- ページ全体の骨格はほぼ共通である
- 差分を `overrides` としてレビュー可能な形で保持したい

### 利用者が `conditions` / `permissions` を選ぶ場面

- 同じ画面定義のまま、主体や実行時条件だけで表示を切り替えたい
- 派生画面を増やすより、1 画面の runtime policy として表したい

### 利用者が `state/flow` を選ぶ場面

- 画面状態の遷移や画面間遷移を明示したい
- UI 構造の再利用ではなく、振る舞いの記述をしたい

## 導入順の推奨

段階導入する。

### Phase 1: `extends` + `overrides`

スコープ:

- 既存 `template` は維持する
- 画面派生のための静的再利用のみ追加する
- runtime condition は扱わない

Done 条件:

- 既存の `template` と競合せず共存できる
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
- `template` / `extends` とは別レイヤーとして説明できる

### Phase 3: `state/flow`

スコープ:

- 画面内部 state
- Navigation Flow DSL との接続

Done 条件:

- 遷移、ガード、状態切替が別責務として定義される
- Navigation の `guard` / `policy` と語彙衝突しない
- 静的再利用の語彙と runtime 振る舞いの語彙が混ざらない

## 非ゴール

このノートの非ゴールは次のとおり。

- テーマ DSL の merge 実装をそのまま画面 DSL に流用すること
- `template` だけで画面継承を表現すること
- `extends` だけで permission/state を解決すること
- 画面 DSL と Navigation Flow DSL を 1 つの文書形式に統合すること
- Phase 1 で完全な runtime expression system まで入れること

## Architect 判断

採用したい判断:

- 既存の `template` は断片再利用として維持する
- 画面 DSL の `extends` は導入候補として妥当
- ただし責務は static reuse のうち「画面派生」に限定する
- `overrides` は配列全置換ではなく ID ベース patch を採る
- permission/state は別レイヤーで表現する

採らない判断:

- `template` と `extends` を無理に 1 機構へ統合する
- `extends` を状態管理機構として使う
- `extends` を権限制御機構として使う
- 画面バリエーションを role x state の組み合わせで大量派生させる

## 直近の次アクション

- 画面 DSL 向け `extends` / `overrides` の最小スキーマ案を作る
- `template` と `extends` の文法・スキーマ境界を明文化する
- override 対象に必要な安定 ID 方針を決める
- Preview / Export / Diff それぞれで必要な解決タイミングを整理する
- `conditions` / `permissions` の最小語彙を Navigation の `guard` と衝突しない形で定義する

関連ドラフト:

- [screen-dsl-extends-overrides-minimal-schema-draft.md](./screen-dsl-extends-overrides-minimal-schema-draft.md): `extends` / `overrides` の Phase 1 最小スキーマ案
