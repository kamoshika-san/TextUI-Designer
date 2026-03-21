# 変更増幅（change amplification）— レビュー D 節の正本

**チケット**: T-20260321-098  
**出典**: 深層アーキレビュー **セクション D**（change amplification 分析）。実装ではなく **経路の地図**として整理する。

親エピック: Vault [[2026-03-21_深層アーキレビュー保守性_トラッキング_エピック]]（T-089）／[[2026-03-21_外部レビュー保守性対応エピック]]（T-062）

## 1. 新コンポーネント追加経路

- **要点**: 名前・型・descriptor・schema・exporter/renderer の **複数面**に触れる。単一点の正本に寄せるため [ADR 0004](adr/0004-component-definition-graph-canonical.md) と [change-amplification-dsl.md](change-amplification-dsl.md) を正にする。
- **関連チケット**: T-075（コンポーネント変更増幅スパイク・Vault）、T-090、T-091（`BUILT_IN` 単一ソース）。

## 2. export target（形式・経路）

- **要点**: Html/Pug/React 等の **形式差**と **Exporter 管轄**が増えるほど、トークン解決・キャッシュ・観測の経路が増える。過度な共通化より **境界ドキュメント**（[exporter-boundary-guide.md](exporter-boundary-guide.md)）を優先。
- **関連チケット**: T-092（Export の Application/Port 分離の第1スライス）

## 3. テーマトークン

- **要点**: kebab マップ・プレビュー CSS・export の **見え方一致**が課題。Spacer 等の例外は MAINTAINER の表を正に。
- **関連**: [MAINTAINER_GUIDE.md](MAINTAINER_GUIDE.md)（テーマ token → CSS）、T-093（プレビュー状態）

## 4. preview（WebView）改善

- **要点**: オーケストレータへの集中が **隠れ状態**を増やす。セッション状態の値オブジェクト化（T-093）で追跡可能性を上げる。
- **関連**: [service-design-webview-manager.md](service-design-webview-manager.md)

## G（スコア・Main bottleneck・1段落）

レビューで示された **G** のスコア（Maintainability / Evolvability / Testability）と **Main bottleneck**（正本の分散・変更増幅）は、実装チケット T-090〜T-096 で **段階的に潰す**前提で読む。**難易度評価**を変える場合は、PR またはチケットに **根拠**を残す。

## 既存ドキュメント

- 実務チェックリスト: [change-amplification-dsl.md](change-amplification-dsl.md)
