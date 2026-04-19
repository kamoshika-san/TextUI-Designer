# Phase 1 実行計画（0〜3ヶ月）

最終更新: 2026-04-16

## 1. 目的と成功条件

Phase 1 の目的は「初回で成功する」状態を作ること。

次の 3 条件を満たすまで、Phase 2 へ進まない。

1. 初回 Preview 成功率が安定して高い
2. 初回 Export 成功率が安定して高い
3. README・CLI・実装・MCP導線の不整合報告がゼロ

## 2. 絶対優先順位（Phase 1）

1. 信頼性（README整合）
2. 初回成功体験（ゴールデンパス）
3. セグメント絞り込み（内部ツール / AI PoC）

## 3. フェーズ内マイルストン（12週想定）

### M1: 整合性の完全除去（S）

- README / package.json / CLI / 実装の整合を統一
- export format の正本を `html / react / svelte / vue / pug` に統一
- MCP サーバーパスを `out/mcp/server.js` で統一
- 未実装コマンド表記は削除 or 実装

完了判定:

- 「README と違う」報告が再現しない
- 主要コマンドのヘルプと実装が一致

### M2: ゴールデンパス3本の固定（S）

- Path 1: `.tui.yml` 作成 -> Preview
- Path 2: `sample/12-navigation/app.tui.flow.yml` を開く -> Flow Preview -> Open linked page でページ遷移確認
- Path 3: MCP `scaffold_app` -> `validate_ui|validate_flow` -> `capture_preview`

完了判定:

- 3パスが README と sample 導線で一致
- 3パスをスモークで毎回再現可能

### M3: サンプル導線の再設計（S）

- 内部業務アプリ: `sample/07-enterprise`
- 管理画面（ナビ含む）: `sample/12-navigation`, `sample/13-enterprise-flow`
- AI生成UI導線: `sample/08-github`（テンプレ分割構成）

完了判定:

- `sample/README.md` の開始導線が3パスを直接案内
- サンプルの役割が重複せず、選択基準が明確

## 4. KPI（Phase 1）

## Activation KPI

- 初回 Preview 成功率 >= 80%
- 初回 Export 成功率 >= 70%
- MCP 実行成功率 >= 60%

## Trust KPI

- 「README と違う」報告数 = 0
- Preview と Export の差異は説明可能な状態で可視化

## 5. KPI 計測方法（実運用）

最小実装として、次の手順で週次集計する。

1. 週次でゴールデンパス3本を各 5 回ずつ実行（計 15 試行）
2. 実行結果を `docs/phase1-kpi-log.md` に追記
3. 成功率を算出し、閾値未達なら次フェーズ移行を停止

算出式:

- Preview 成功率 = Preview 成功数 / Path1+2 試行数
- Export 成功率 = Export 成功数 / Path2 試行数
- MCP 成功率 = MCP 成功数 / Path3 試行数

## 6. Go / No-Go 判定

Go 条件（全て必須）:

- Activation KPI 3指標が連続 2 週で閾値達成
- Trust KPI 2指標が連続 2 週で達成

No-Go 条件（1つでも該当で停止）:

- 初回成功率が閾値未達
- README/実装の不整合が再発

## 7. 実装タスク（今回着手済み）

- README の export 設定・MCP パス・ゴールデンパス記述を整合化
- `textui-designer.openFlowPreview` をコマンドとして実装
- VS Code export の built-in format を `svelte` / `vue` 含めて統一
- CLI help を実装実態に合わせて修正
- CLI version を `package.json` 参照に統一

## 8. 次アクション（Phase 1 継続）

1. `docs/phase1-kpi-log.md` を作成し、週次計測運用を開始
2. Preview vs Export 差分の可視化方法（最低限: 既知差異リスト）を README へ追記
3. ゴールデンパスの自動スモーク（CI 軽量ジョブ）を追加
