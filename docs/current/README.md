# 現行バージョン向けドキュメント（`docs/current`）

このツリーは、**現在の製品・実装契約に直結する**説明・手順・境界ガイドの正本置き場である。旧 `docs/*.md` 直下にあった現行向け Markdown は、機能横断で探しづらかったため、**カテゴリ別サブフォルダ**へ移した。

## カテゴリ一覧

| フォルダ | 内容 |
| --- | --- |
| [`workflow-onboarding/`](workflow-onboarding/README.md) | セットアップ、設定、組み込みコンポーネント、CLI 利用など日々の開発入口 |
| [`runtime-boundaries/`](runtime-boundaries/README.md) | 拡張機能・CLI・MCP・エクスポータ等の境界と所有権 |
| [`services-webview/`](services-webview/README.md) | スキーマパイプライン、サービス設計、WebView 更新、contributes |
| [`testing-ci/`](testing-ci/README.md) | テスト方針、CI 品質ゲート、スモーク、SSoT ガード行列 |
| [`operations/`](operations/README.md) | メンテナ向けガイド、レビュー運用、ロードマップ、受入・KPI |
| [`theme-export-rendering/`](theme-export-rendering/README.md) | テーマ・トークン、エクスポート契約、モーダル／Svelte 等の出力仕様 |
| [`dsl-ssot-types/`](dsl-ssot-types/README.md) | DSL・型・SSoT・ナビ v2・スクリーン DSL 設計メモ |
| [`architecture-assessments/`](architecture-assessments/README.md) | アーキレビュー、リファクタ評価、命名整理メモ |
| [`diff/`](diff/README.md) | diff 正規化・IR・サマリ・回帰・ヒューリスティクス等の契約群 |
| [`documentation-governance/`](documentation-governance/README.md) | ドキュメント IA・台帳・運用ルール・負債ランキング |
| [`visual-diff/`](visual-diff/README.md) | ビジュアル diff・オーバーレイ・段階的レンダリング導入 |

## 置いていないもの（境界）

- **ADR**: 引き続き [`../adr/`](../adr/)（アーキ決定の長期参照）
- **Runbook**: [`../runbook/`](../runbook/)
- **将来仕様・v2 語彙**: [`../future/README.md`](../future/README.md)
- **履歴（リリースノート・スプリント締め等）**: [`../archive/README.md`](../archive/README.md)（[`historical-notes/README.md`](historical-notes/README.md) に退避の案内のみ残置）

## 参照パスについて

リポジトリ内の相互リンクは `docs/current/<カテゴリ>/<ファイル名>.md` 形式に更新済みである。履歴系は `docs/archive/<ファイル名>.md`。外部ブックマークは新パスへの差し替えが必要な場合がある。
