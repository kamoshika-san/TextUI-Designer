# 推奨モジュール境界ロードマップ（深層アーキレビュー F）

**チケット**: T-20260321-097  
**出典**: 深層アーキレビュー（Executive summary〜Final verdict）の **セクション F**（推奨境界・インターフェース候補）を要約。実装の正本ではなく **読み手が次に触る層を選べる地図**とする。

## 推奨の四層（概念）

| 層 | 置くもの（例） | まだ抽象化しない／注意 |
|----|----------------|------------------------|
| **Domain** | `ComponentDef` / DSL 中立型（`dsl-types`）、ドメイン不変条件 | `renderer/types` への直参照は [ADR 0003](adr/0003-dsl-types-canonical-source.md)・棚卸し表に従い縮小 |
| **Application** | ユースケース単位のオーケストレーション（将来の ExportApplicationService 等） | いきなり全コマンドを Application に寄せない（T-099 スパイクで範囲を切る） |
| **Adapters** | VS Code API・ファイル IO・MCP・CLI への境界 | Exporter の **形式差異**はまだこの層で吸収してよい（過剰な共通 IF 化は不要） |
| **Presentation** | WebView React・プレビュー配信・QuickPick/SaveDialog（`ExportInteractionPort` 等の候補） | プレビューと CLI の `$include` 意味一致は [dsl-include-resolution.md](dsl-include-resolution.md) を正に |

## レビュー F で名前が挙がった境界（導入候補）

- **DslModelProvider** — DSL 解釈結果を上位に渡す候補（実装は別チケット）。
- **PreviewTransport** — WebView へのメッセージ経路の単一化候補。
- **ExportInteractionPort** — 保存ダイアログ・通知など UI 依存の出口（T-092）。
- **typed codec / unknown 削減** — T-096。

## 「まだ抽象化しない」領域

- **Exporter 形式ごとのテンプレ差**: 共通の巨大インターフェースより、既存 `BaseComponentRenderer` / 各 exporter の差分を尊重。
- **MCP ツール面**: サーバ境界は [mcp-boundary-guide.md](mcp-boundary-guide.md) を正とし、Application 層へ一括寄せない。

## 既存ドキュメントとのリンク

- [MAINTAINER_GUIDE.md](MAINTAINER_GUIDE.md) — 境界ガイド索引
- [change-amplification-dsl.md](change-amplification-dsl.md) — 変更増幅の実務チェックリスト
- [ADR 0004](adr/0004-component-definition-graph-canonical.md) — コンポーネント定義グラフの設計正本

## T-090〜T-099 対応表（本レビュー観点）

| チケット | 本ドキュメントとの関係 |
|----------|------------------------|
| T-090 | 定義グラフを設計正本に近づける ADR（Domain/派生の説明と整合） |
| T-091 | built-in 列挙の単一ソース化（Domain の入口を狭める） |
| T-092 | Export の Application / Port 分離（Application 層の具体例） |
| T-093 | プレビュー状態の値オブジェクト化（Presentation 近傍） |
| T-094 | Diagnostic のドメインとアダプタ分離 |
| T-095 | テスト基盤の注入優先 |
| T-096 | typed codec / unknown 削減 |
| **T-097** | **本ファイル（境界ロードマップ）** |
| T-098 | レビュー D の change amplification 正本（別紙） |
| T-099 | Application ユースケース層スパイク |

## G（参考・1段落）

レビューで示された **Maintainability / Evolvability / Testability** のスコアは、**境界が増えすぎると逆に Evolvability が落ちる**という前提で読む。**Main bottleneck** は「正本の分散」と「変更増幅」であり、本ロードマップは **どの層を次に硬くするか**の優先を議論するための材料である。
