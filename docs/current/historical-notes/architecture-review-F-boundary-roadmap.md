# 推奨モジュール境界ロードマップ（深層アーキレビュー F）

**チケット（EF 正本索引）**: **T-20260321-112**（本ファイルを **ロードマップ F の 1 本索引**として保守する）  
**由来**: T-20260321-097（旧・レビュー F の要約）を発展させたもの。履歴対応表は下記「T-090〜T-099 対応表」を維持。

**出典**: 深層アーキレビュー（Executive summary〜Final verdict）の **セクション F**（推奨境界・インターフェース候補）を要約。実装の正本ではなく **読み手が次に触る層を選べる地図**とする。

## import ルール（T-110）との相互リンク

- **4 レーンの import 方針**（正本・ESLint 第 1 弾は WebView→Export 禁止）: [import-boundaries-4-lanes.md](import-boundaries-4-lanes.md)  
- 本ファイルは **語彙と境界の「なぜ」**、T-110 側は **「どこからどこへ import してよいか」**を主眼とする（重複は避け、相互にリンクで往復できること）。

## 推奨の四層（概念）

| 層 | 置くもの（例） | まだ抽象化しない／注意 |
|----|----------------|------------------------|
| **Domain** | `ComponentDef` / DSL 中立型（`dsl-types`）、ドメイン不変条件 | `renderer/types` への直参照は [ADR 0003](adr/0003-dsl-types-canonical-source.md)・棚卸し表に従い縮小 |
| **Application** | ユースケース単位のオーケストレーション（将来の ExportApplicationService 等） | いきなり全コマンドを Application に寄せない（T-099 スパイクで範囲を切る） |
| **Adapters** | VS Code API・ファイル IO・MCP・CLI への境界 | Exporter の **形式差異**はまだこの層で吸収してよい（過剰な共通 IF 化は不要） |
| **Presentation** | WebView React・プレビュー配信・QuickPick/SaveDialog（`ExportInteractionPort` 等の候補） | プレビューと CLI の `$include` 意味一致は [dsl-include-resolution.md](dsl-include-resolution.md) を正に |

## 導入候補 interfaces / abstractions（索引）

実装の完了を意味しない。**名前・責務・既存ドキュメント／コードへの接続**を 1 箇所に集約する。

| 候補 | 責務の要約 | 接続点（入口） |
|------|------------|----------------|
| **ComponentContractRegistry**（概念） | コンポーネント定義の登録・取得・一貫性 | [ADR 0004](adr/0004-component-definition-graph-canonical.md)、[component-add-contract.md](component-add-contract.md) |
| **Preview 更新パイプライン**（**PreviewUpdateCoordinator**・将来の **ポート分割**） | 1 回のプレビュー送信内のフェーズ追跡／責務分割 | [preview-update-pipeline.md](preview-update-pipeline.md)、[webview-update-manager-responsibilities.md](webview-update-manager-responsibilities.md) |
| **Export 実行経路**（**ExportExecutionPipeline** 概念） | registry + dispatch を中心とした export の本流と観測の分離 | [exporter-boundary-guide.md](exporter-boundary-guide.md)、[observability-and-cache-boundary.md](observability-and-cache-boundary.md)、[export-manager-separation-policy.md](export-manager-separation-policy.md) |
| **型付き DecodedComponent / typed codec** | `name` / `props` を連動させ unknown 依存を減らす | [typed-codec-types-layering.md](typed-codec-types-layering.md)、[ADR 0003](adr/0003-dsl-types-canonical-source.md) |
| **ExportInteractionPort** | 保存ダイアログ・通知など UI 依存の出口 | T-092 系・[exporter-boundary-guide.md](exporter-boundary-guide.md) |
| **DslModelProvider**（候補） | DSL 解釈結果を上位へ渡す境界 | 実装は別チケットで段階導入 |

## レビュー F で名前が挙がった境界（導入候補・補足）

- **PreviewTransport** — WebView へのメッセージ経路の単一化候補（命名・実装は将来チケット）。
- 上表の **typed codec** は T-096 / T-108 レーンで反復。

## 「まだ抽象化しない」領域（ロードマップ F の要約）

- **Exporter 形式ごとのテンプレ差**: 共通の巨大インターフェースより、既存 `BaseComponentRenderer` / 各 exporter の差分を尊重。
- **UI 共通 renderer の無理な共通化**: 種別ごとのレンダラ差分を無視した単一 IF 化は避ける（[base-component-renderer-dispatch.md](base-component-renderer-dispatch.md) の方針と整合）。
- **export target 細部の早期共通化**: 形式別の細部を 1 抽象に押し込めない（[exporter-boundary-guide.md](exporter-boundary-guide.md)）。
- **performance settings の統合 abstraction**: 監視・キャッシュ境界は [observability-and-cache-boundary.md](observability-and-cache-boundary.md) に閉じ、設定束ねの巨大 IF は先に作らない。
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
