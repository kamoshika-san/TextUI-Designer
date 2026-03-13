# Refactoring Assessment (2026-03-12)

## 1) 今回の確認スコープ

- `src/` 配下の主要ホットスポット（行数上位ファイル）を対象に、責務分離・重複・分岐肥大の観点で確認。
- 実装変更は行わず、現状評価と優先度付き候補の整理を実施。

## 2) 現状サマリ

- 既存のP1/P2（Diagnostics分割、Traversal抽象化、types分割、Exporter共通化）は概ね反映済み。
- 現時点の主戦場は「機能不全修正」より「将来の変更コスト削減（保守性改善）」。
- 特に Core / Theme / Schema / CLIサポート層で、責務が集約されやすい構造が残っている。

## 3) 優先度つきリファクタリング候補（2026-03-12版）

### P1: `TextUICoreEngine` のコンポーネント分岐を定義駆動へ移行

対象: `src/core/textui-core-engine.ts`

観点:
- `buildComponent` で `Container/Form/Tabs/Accordion/TreeView` の構築分岐を逐次実装しており、コンポーネント種追加で条件分岐が伸びる構造。
- `applyRequiredDefaults` も `componentType` ごとの長い分岐でデフォルト値を付与しており、ルール追加時に1メソッド集中で衝突しやすい。

提案:
- 「子要素の取り回し（components/fields/actions/items）」と「必須デフォルト」を `ComponentSpec` へ移し、typeごとのハンドラを登録方式に。
- `buildComponent` は共通オーケストレーションのみ担当し、各type固有処理を分離。

期待効果:
- 新コンポーネント追加時の差分局所化
- テスト容易性向上（type単位で仕様確認しやすい）

---

### P1: `ThemeManager` のデータ定義とロード処理を分離

対象: `src/services/theme-manager.ts`

観点:
- `defaultTokens` / `defaultComponents` がクラス内に大きく内包され、I/O・継承解決・検証・merge責務と同居している。
- `loadTheme` 周辺にログ/解決/検証/復旧が集約され、障害時の原因切り分けが難しくなりやすい。

提案:
- デフォルトテーマ定義を `src/theme/default-theme.ts` などへ切り出し。
- `ThemeLoader`（ファイル解決・継承展開）と `ThemeMerger`（default + user merge）を分割。
- `ThemeManager` は orchestrator + public API のみに縮退。

期待効果:
- テーマ仕様変更時の影響範囲縮小
- テーマ解決ロジックの単体テスト拡充

---

### P2: `SchemaManager` の3系統キャッシュを統一抽象へ寄せる

対象: `src/services/schema-manager.ts`

観点:
- main/template/theme の cache・lastLoad・path が並列管理され、状態項目が増えるたびに更新漏れリスクがある。
- 初期化・登録・読み込みの関心事が単一クラスで密結合。

提案:
- `SchemaSlot`（path/cache/lastLoad）を `Record<'main'|'template'|'theme', ...>` で統一管理。
- 読み込み/TTL判定/JSON parse を `SchemaRepository` 相当へ抽出。
- VS Codeへの設定反映のみ `SchemaManager` 側に残す。

期待効果:
- スキーマ種別追加時の実装ミス防止
- キャッシュ挙動の再利用性向上

---

### P2: `command-support` のI/Oと業務ロジックを境界分離

対象: `src/cli/command-support.ts`

観点:
- `validate/plan/apply` の制御に加えて、標準入出力フォーマット・ファイル配置決定・state競合判定が同居。
- 将来コマンド追加時に同種処理（結果整形・エラーハンドリング）の重複が増える可能性。

提案:
- `ApplyService`（純粋ロジック）と `CliReporter`（stdout/stderr/json出力）に分離。
- `applyAcrossFiles` は orchestration のみにして、終了コード規約を明確化。

期待効果:
- CLI拡張時の回帰リスク低減
- ロジック単体テストの追加容易化

## 4) 推奨実行順

1. `TextUICoreEngine` の定義駆動化（P1）
2. `ThemeManager` 分離（P1）
3. `SchemaManager` キャッシュ統一（P2）
4. `command-support` 境界分離（P2）

## 5) 備考

- 今回は「評価依頼」対応のため、コード変更は行っていない。
- 次段で実装に入る場合は、P1を小分けPR（1テーマ1PR）で進めると安全。
