# チーム運用ルール（外部アーキ 4 則）

外部アーキテクト指摘の **「チーム向け運用ルール案」**を、リポジトリ向けに短く整理した正本（出典: Vault `Tasks/Inbox-PM/Archive/2026-03-21_外部アーキテクトからの指摘.md`）。**強制 CI 化はしない**（ルールの自覚とレビューでの参照用）。

## ルール 1 — descriptor 起点

**新しい component を追加するときは descriptor 起点で始める。**  
`renderer/types.ts` やプレビュー／エクスポート実装から先に増やさない。

- 実務のチェックリスト: [adding-built-in-component.md](adding-built-in-component.md)  
- 契約（5 要素セット）: [component-add-contract.md](component-add-contract.md)

## ルール 2 — 解析・検証の一本化

**preview / diagnostics / completion で別々に parse／validate しない。**  
共通の解析・検証経路（スキーマ／descriptor に沿った流れ）を優先する。

- 関連する境界整理の議論: Vault チケット `T-20260321-057`（DocumentAnalysisService ADR 系）を参照。

## ルール 3 — 最適化と観測の分離

**「最適化」は効果が明確なものだけコアに残す。**  
観測用ロジックは instrumentation に隔離する。

- 説明: [export-instrumentation.md](export-instrumentation.md)  
- 命名の整理案: [export-diff-metrics-naming.md](export-diff-metrics-naming.md)

## ルール 4 — Manager 乱立よりパターン化

**Manager を増やすより、Session / Store / Registry / Resolver / Policy を検討する。**  
責務の粒度が追いやすくなるよう、名前と境界を揃える。

- 製品境界の include など: Vault チケット `T-20260321-042`（include パリティ）とロードマップを参照。

## 任意参照（チケット id）

| id | 内容（概要） |
|----|----------------|
| T-042 | DSL `$include` の CLI / Export / Capture パリティ |
| T-057 | DocumentAnalysisService（共通分析の ADR 初稿） |
