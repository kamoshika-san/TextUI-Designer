# Semantic Diff v2 WebView Layout Proposals

## 目的

semantic diff v2 の WebView パネルで、`Screen -> Entity -> Component -> diffs[]` の階層を崩さずに、レビュー担当者が「どこが変わったか」「どの判断を信頼できるか」「根拠を追えるか」を短時間で確認できる画面レイアウトを検討する。

このフォルダの `.tui.yml` は実装仕様ではなく、WebView 画面構成を議論するための DSL モックである。実データは v2 payload の概念に合わせたプレースホルダーを使う。

## 前提

- 対象ユーザー: PR レビュー担当者、差分調査担当者、semantic diff v2 の品質確認担当者。
- 情報構造: 既存方針どおり `Screen -> Entity -> Component -> diffs[]` を主導線にする。
- 表示する主な情報: `diff_event`、confidence band、review status、evidence summary、before/after predicate。
- 対象外: 新しい DSL コンポーネント、WebView 実装、postMessage 仕様、レンダラー追加。

## 3案の比較

| パターン | 主目的 | 強い場面 | 注意点 |
|---|---|---|---|
| Pattern A: Triage Dashboard | 初回スキャンと優先度判断 | 変更量が多い PR、MVP の標準画面 | 深掘り操作は右ペインに寄るため、1件を長く読むには情報密度が高い |
| Pattern B: Reviewer Drilldown | レビュー判断とフォローアップ | 中信頼・要確認の差分を人が判断する場面 | 全体俯瞰より選択中コンポーネントの読解を優先する |
| Pattern C: Evidence Audit | 根拠追跡と監査 | v2 判定の説明、回帰調査、外部共有前の確認 | 日常レビューでは詳細すぎるため MVP 初期表示には重い |

## Pattern A: Triage Dashboard

`pattern-a-triage-dashboard.tui.yml`

左に階層ツリー、中央に差分イベント表、右に根拠と説明を置く。レビュー担当者はまず Screen/Entity/Component の場所を把握し、中央の表で high/medium/low と review status を見て、必要なものだけ右側で確認する。

MVP の既定案として最も適している。v2 の階層構造をそのまま表示でき、既存の「構造差分」と「semantic v2」をタブで共存させる将来設計にもつなげやすい。

## Pattern B: Reviewer Drilldown

`pattern-b-reviewer-drilldown.tui.yml`

上部にパンくずと対象コンポーネントのサマリを置き、タブで severity/axis を切り替える。中央は選択中コンポーネントの差分表、下部は `decision` と `explanation` のアコーディオンにする。

人間の判断が必要な medium confidence、review required、renamed/moved に近い曖昧な差分に向く。MVP では Pattern A の詳細モードとして取り込むと扱いやすい。

## Pattern C: Evidence Audit

`pattern-c-evidence-audit.tui.yml`

evidence と canonical predicate を主役にする。信頼度分布、根拠パス、before/after predicate、生成理由を並べ、semantic diff v2 の判断根拠を検証できる形にする。

通常レビューの初期画面ではなく、監査、エクスポート、回帰調査、v2 provider の品質確認に向く。Pattern A/B から「根拠を開く」導線で遷移するのがよい。

## 推奨

MVP の既定画面は Pattern A とする。理由は、既存方針の `Screen -> Entity -> Component -> diffs[]` を最も素直に保ち、レビュー担当者が変更の優先度を最短で判断できるため。

Pattern B は「選択した差分をレビューする詳細モード」、Pattern C は「根拠監査・説明用モード」として後続フェーズで取り込む。

## 検証

作成時点では TextUI MCP `validate_ui` を優先して試し、MCP が利用できない場合はローカル CLI の `validate --file --json` で検証する。

## 2026-04-23 Pattern A rendering drift note

Pattern A initially used fixed percentage columns (`24% / 46% / 30%`) and long `diff_event` / evidence strings. In WebView and capture output, this made the center table and right evidence panel compete for horizontal space, causing visible truncation and a narrow table at common preview widths.

The current Pattern A keeps the same three-column IA, but uses `flexGrow` with `minWidth` for the body columns and shorter table/evidence labels. If clipping remains after this DSL-local adjustment, treat the remaining issue as renderer or capture-pipeline work rather than further shortening the mock data.
