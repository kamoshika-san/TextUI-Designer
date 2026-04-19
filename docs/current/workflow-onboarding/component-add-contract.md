# ビルトインコンポーネント追加の契約（Phase 1）

外部アーキ指摘 **Phase 1** に沿い、組み込みコンポーネントを **1 セット**として追加するときの **責務と順序**を固定する。**ファイルパスの一覧**は [adding-built-in-component.md](adding-built-in-component.md)（T-054）を正とし、本書は **契約（何を同時に満たすか）** に特化する。

## 1 セットとして扱う 5 要素

次を **単独ではマージしない**（PR では可能な限り同一変更に含める。分割する場合は依存順と後続 PR を明記する）。

| # | 要素 | 意味するもの（要約） |
|---|------|---------------------|
| 1 | **Descriptor エントリ** | `COMPONENT_DEFINITIONS` に載る 1 行分（名前・説明・`schemaRef`・プレビュー/エクスポートキー等）。descriptor graph の正本。 |
| 2 | **Schema 定義** | `schemaRef` が指す JSON Schema 断片と、`schema.json` の `components` oneOf との **整合**（生成パイプライン経由を含む）。 |
| 3 | **Preview renderer** | WebView 上でそのコンポーネントを描画する登録（`component-map.tsx` と `src/renderer/components/*`）。 |
| 4 | **Exporter capability** | 各出力形式でそのコンポーネントをレンダリングする経路（`base-component-renderer` 等の分岐・テンプレート）。 |
| 5 | **Tests** | 少なくとも **descriptor / 型 / スキーマ**の同期を検証する既存テスト（例: `dsl-types-descriptor-sync`）を通す。必要に応じて **回帰 1 件**を追加。 |

## 責務と推奨順序

1. **DSL 側の名前と型**（`BUILT_IN_COMPONENTS` / `DSL_COMPONENT_KINDS` / `ComponentDef`）を先に決め、**descriptor 1 行**と矛盾させない。
2. **Schema** は descriptor の `schemaRef` を基準にし、**compile 後の生成物**まで含めて drift しないこと。
3. **Preview と Exporter** は同じ「コンポーネント意味」を表すように揃える（プロパティ名・必須・バリアント）。
4. **Tests** は CI で **1 要素だけ欠けた変更**を検知できる状態を維持する。

## T-054（チェックリスト）との関係

- **手順・パス**: [adding-built-in-component.md](adding-built-in-component.md)
- **増幅の説明**: [change-amplification-dsl.md](change-amplification-dsl.md)
- 本書は上記と **矛盾しない**（契約＝「5 要素セット」、054＝「どのファイルを触るか」）。

## やらないこと（本ドキュメントのスコープ外）

- 大規模 SSOT 生成の全面実装（親エピック・別チケット）
- 外部 provider 経由のコンポーネント追加（別ポリシー）
