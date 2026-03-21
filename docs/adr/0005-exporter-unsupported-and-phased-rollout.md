# ADR 0005: ビルトイン追加時の exporter 必須範囲・unsupported 出力の方針

**日付**: 2026-03-22  
**チケット**: T-20260322-188（E2-S1-T2）  
**ステータス**: 採用

## コンテキスト

組み込みコンポーネントを増やすたびに **preview / 各 export 形式 / descriptor / schema** の更新幅が広がる。**初回から全 exporter を揃えるか**、**まずプレビューと HTML のみ**に寄せるか、**マージ前にどこまで必須か**が曖昧だとレビューと CI の期待が揺れる。

また `BaseComponentRenderer` は、ハンドラに解決できない DSL 断片に対して **形式別のコメント**（unsupported 明示）を出す。この挙動と「ビルトインとして載せる責務」を混同しない必要がある。

## 決定

### 1. `BUILT_IN_COMPONENTS` に載った名前に対する必須範囲

- **本リポジトリの main にマージされる時点**では、次を満たすこと（`tests/unit/component-contract-consistency.test.js` が固定）:
  - `BUILT_IN_COMPONENTS`・`COMPONENT_DEFINITIONS`・`COMPONENT_MANIFEST`・`BUILT_IN_EXPORTER_RENDERER_DEFINITIONS` が **名前ごとに閉じている**こと。
  - 各ビルトインは **descriptor 経由で exporter の `renderXxx` にディスパッチ可能**であること（`exporterRendererMethod` と `BaseComponentRenderer` の登録が整合）。
- したがって **「preview + HTML primary のみでマージし、Pug/React export は後回し」という抜け道は、ビルトイン名を列挙に載せた状態では採用しない**。段階導入は **ブランチ内**または **`BUILT_IN_COMPONENTS` に載せる前**に留める。

### 2. 段階的実装（マージ前の進め方）

- フィーチャーブランチでは **プレビュー先行・HTML 先行**でもよいが、**マージ前**に [adding-built-in-component.md](../adding-built-in-component.md) のチェックリスト（domain → schema/descriptor → facade → guard）を完走する。
- リリースに載せない **実験用 kind** は、`BUILT_IN_COMPONENTS` に **入れない**（契約テスト・ユーザー向け built-in 一覧から外れる）。

### 3. unsupported コメント出力（`BaseComponentRenderer`）の意味

- `renderUnsupportedComponent` は、**登録済みハンドラに解決できない** DSL 断片に対し、次のような **明示コメント**を返す（形式ごと）:
  - HTML: `<!-- 未対応コンポーネント: <name> -->`
  - React / Pug: 同趣旨のコメント
- これは **未知のキー・未登録の経路**へのフォールバックであり、**ビルトインとして採用したコンポーネントを exporter 未実装のまま「コメントだけ」で済ませる**用途ではない（その場合は built-in 契約に反する）。

## Vault（Obsidian）との相互参照

- **新 built-in 起票テンプレ**（T-187）: Vault `Tasks/Template/新built-in追加チケット-template.md`（索引: `Tasks/Template/README.md`）。テンプレのチェックリストは本 ADR・[adding-built-in-component.md](../adding-built-in-component.md) と同じ「マージ時点で契約を満たす」前提で読む。
- コード側の手順の正本: [adding-built-in-component.md](../adding-built-in-component.md)。

## 関連

- [adding-built-in-component.md](../adding-built-in-component.md) — 実務チェックリスト・4 フェーズ
- [base-component-renderer-dispatch.md](../base-component-renderer-dispatch.md) — export 側ディスパッチ
- [ADR 0004](0004-component-definition-graph-canonical.md) — descriptor グラフを正本に近づける方針
