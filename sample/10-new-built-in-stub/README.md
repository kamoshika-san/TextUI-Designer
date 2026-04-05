# 新規ビルトイン用サンプル・スタブ（`09-new-built-in-stub`）

**目的**: 組み込みコンポーネント追加時に、**最小の DSL** と **検証手順**をコピーして始められるようにする（T-192）。

## 使い方（最短）

1. このフォルダを丸ごと複製するか、`new-built-in-stub.tui.yml` だけを自分の作業ブランチ用パスにコピーする。
2. `page.id` と `title` をユニークな値に変える。
3. `components` 内の `Text` ブロックを、追加した **新 kind**（例: `Foo`）に置き換える。
4. リポジトリルートで `npm run compile` のあと `npm run validate:samples` を実行し、**当該 YAML が緑**であることを確認する。
5. 契約・タッチ箇所の一覧は [../../docs/adding-built-in-component.md](../../docs/adding-built-in-component.md)。回帰テストの足し方は [../../docs/new-built-in-sample-regression-stub.md](../../docs/new-built-in-sample-regression-stub.md)。

## 関連

- Vault 起票テンプレ（sample チェックリスト）: TextUI-Designer-Doc `Tasks/Template/新built-in追加チケット-template.md`
