> Status: historical
> Updated: 2026-04-19
> Owner: Maintainer
> Reason: `docs/current/historical-notes` から読者主導線を切り離すため `docs/archive/` へ移設（T-20260419-022）
> Replacement: [現行ドキュメント索引](../current/README.md) 。リリース内容の要約はリポジトリルートの `CHANGELOG.md` を参照。

# 変更増幅（change amplification）— 生成／自動登録スパイク（T-075）

## 目的

新コンポーネント追加時の **多点更新**を減らすため、descriptor（または既存 SSOT）から **1 経路だけ**自動化できるかを検証し、採用／不採用と次の打ち手を固定する。

## 現状の更新点（短い整理）

- **機械同期**: `tests/unit/dsl-types-descriptor-sync.test.js` が `DSL_COMPONENT_KINDS`（`src/domain/dsl-types/（公開エントリ: index.ts）`）と `BUILT_IN_COMPONENTS`（`src/components/definitions/built-in-components.ts`）の **集合一致**を検証する。片方だけ更新すると CI で失敗する。
- **手動チェックリスト**: [[change-amplification-dsl.md]] に、追加時の推奨順（built-in → DSL 型 → manifest / exporter / schema 等）を記載済み。

## スパイク結果（概念実証）

### 試したこと

- **既存テストを「最小の自動化」として位置づける** — 新規 codegen なしでも、**集合同期**は CI で常に検知できる。
- **追加の生成パイプライン**（例: exporter-renderer-definitions の完全生成）は、テンプレとビルドステップの保守コストが大きく、**本リポジトリの現フェーズでは「フル codegen」は見送り**が妥当。

### 結論（推奨）

| 案 | 採用 | 理由 |
|----|------|------|
| 既存の同期テスト + チェックリスト運用 | **採用（継続）** | コスト最小・回帰の正が明確 |
| 1 経路だけの生成スクリプト（例: built-in 名一覧の Markdown 出力） | **任意（後続チケット）** | ドキュメント鮮度には効くが、T-075 の必須スコープ外としてよい |
| 全コンポーネントの codegen 化 | **不採用（現時点）** | チケットの「やらないこと」に合致。スライス単位の ADR が溜まってから再評価 |

## T-076 / T-069 への引き継ぎ

- **FormField / FormAction の分岐削減**（T-076）は、**レンダラ側のディスパッチ統一**で進める（実装は別コミット）。
- **dispatch / BaseRenderer 縮小**（T-069 系 Archive）と接続する際は、本ドキュメントの「同期テストを正とする」前提を崩さないこと。

## 関連

- [[change-amplification-dsl.md]] — DSL 型と descriptor のメモ
- 親: Tasks `T-20260321-075`（Vault）
