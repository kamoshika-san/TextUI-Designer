# 新ビルトイン追加 — sample と preview/export 回帰の雛形（コピーして始める）

**1段落**: 追加作業では **最小 DSL**（`sample/09-new-built-in-stub/`）をコピーし、`npm run validate:samples` で緑にしたうえで、必要なら **エクスポータ回帰**を 1 本足す。契約の正本は [adding-built-in-component.md](adding-built-in-component.md) と [component-add-contract.md](component-add-contract.md)。

## 必須タッチ箇所（再掲）

- **コード**: `docs/current/workflow-onboarding/adding-built-in-component.md` のチェックリスト（domain → descriptor → プレビュー → exporter → 検証）。
- **サンプル**: 本リポジトリでは `sample/09-new-built-in-stub/new-built-in-stub.tui.yml` を起点にする（`sample/README.md` に一覧あり）。

## 手順（コピーして始める）

1. `sample/09-new-built-in-stub/` を参考に、**一意の `page.id`** を持つ `*.tui.yml` を置く（または当該ファイルを複製して編集）。
2. 新 kind を `components` に追加できる状態になったら、`Text` のスタブを差し替える。
3. `npm run compile` → `npm run validate:samples`（[sample/README.md](../sample/README.md) の品質ゲート）。
4. PR 前に `npm run check:dsl-types-ssot`（該当時）と `npm test`。

## 回帰テストの足し方（既存パターン）

- **サンプル DSL を CI で固定**したい場合: `tests/unit/new-built-in-stub-sample-regression.test.js` が `09-new-built-in-stub` の YAML を読み、`HtmlExporter` で HTML を生成できることを検証する。**スタブの文言を変えたらテストの期待文字列も合わせる**。
- **複数 exporter の構造比較**: `tests/unit/exporter-family-structure-regression.test.js` と同様に、同一 DSL オブジェクトで HTML / React / Pug の主要構造を assert するパターンをコピーして、新コンポーネントを `components` 配列に追加する。

## チケットからの辿り方（Vault）

- `Tasks/Template/新built-in追加チケット-template.md` の **4. sample** / **5. tests** と、本ページ・`sample/09-new-built-in-stub/README.md` を相互にリンクして用いる。
