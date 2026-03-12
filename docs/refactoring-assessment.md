# Refactoring Assessment (2026-03-12)

## 1) 現在の健全性チェック結果

- `npm run lint` は成功（警告/エラーなし）。
- `npm run test:all` は成功（unit/integration/e2e/regression を完走）。
- 現時点でリグレッション兆候は見られず、リファクタリングは「品質改善・保守性改善」が主目的。

## 2) 優先度つきリファクタリング候補（進捗反映）

### P1: `DiagnosticManager` の責務分割（完了）

対象: `src/services/diagnostic-manager.ts`

観点:
- 単一クラスが「デバウンス制御・キャッシュ管理・YAMLパース・AJV管理・診断生成・メモリ追跡」を同時に担当しており責務が肥大化。
- デバウンス値が定数 (`DEBOUNCE_DELAY = 500`) と実処理 (`setTimeout(..., 300)`) で不整合。
- キャッシュ判定が複数箇所にあり、変更時の不整合リスクがある。

提案:
- `DiagnosticScheduler`（debounce/throttle）
- `DiagnosticValidationEngine`（YAML parse + AJV + schema cache）
- `DiagnosticCacheStore`（TTL/LRU）
- `DiagnosticManager` はオーケストレーション専任

期待効果:
- 変更影響範囲の局所化
- テスト粒度の向上（ユニットで挙動を分離検証しやすい）

---

### P1: `theme-token-resolver` の走査ロジックをコンポーネントレジストリ連携へ（完了）

対象: `src/cli/theme-token-resolver.ts`

観点:
- トークン解決そのものに加え、コンポーネント木の再帰走査ルールを手続き的に内包している。
- `Container/Form/Tabs/Accordion/TreeView` など構造ごとの分岐が増え、コンポーネント追加時の追従漏れリスクが高い。

提案:
- 走査ルールを `ComponentTraversalSpec` のような定義データに分離。
- 可能なら `registry/component-registry` 側へ寄せて、CLIとExporterで再利用。

期待効果:
- 新コンポーネント追加時の変更点を最小化
- `resolveDslTokens` の責務を「token解決」に集中

---

### P2: `src/types/index.ts` の分割（完了）

対象: `src/types/index.ts`

観点:
- schema/service/theme/cache/performance など複数ドメイン型が1ファイルに集約されている。
- 依存方向が見えにくく、将来的に循環参照・import肥大化の温床になりやすい。

提案:
- `src/types/schema.ts`
- `src/types/services.ts`
- `src/types/theme.ts`
- `src/types/performance.ts`
- `src/types/index.ts` は re-export のみ

期待効果:
- 型定義変更時の認知負荷低減
- ドメイン境界の可視化

---

### P2: Exporter のトークンスタイル付与処理の共通化点検（完了）

対象: `src/exporters/react-exporter.ts`, `src/exporters/pug-exporter.ts`, `src/exporters/base-component-renderer.ts`

観点:
- 各コンポーネント描画で token style の付与パターンが多く、形式別に重複しやすい。
- 既にベースクラスは存在するが、出力形式差分以外の共通化余地が残る。

提案:
- token style 解決の共通 API を base 側へ寄せる。
- 各 exporter は「構文差分（React/Pug/HTML）」のみ担当。

期待効果:
- 形式追加時の実装コスト削減
- 既存形式間の挙動差異バグを抑制

## 3) 実行順（更新）

1. ✅ `DiagnosticManager` 分割（完了）
2. ✅ `theme-token-resolver` の走査戦略抽象化（完了）
3. ✅ `types` 分割（完了）
4. ✅ Exporter 共通化の仕上げ（完了）

## 4) 補足（今回の評価方針）

- まず健全性（lint/test）を再確認し、壊れていないことを前提に「将来の変更コストが高い箇所」を優先抽出。
- 既存機能追加が活発な CLI / diagnostics / exporter を重点的に確認。


## 5) 現在の状態

- P1/P2で定義した主要リファクタ項目（Diagnostics責務分離、Traversal抽象化、types分割、Exporter token style共通化）は完了。
- 次フェーズは、機能追加時の継続的な重複監視と、Exporterのテンプレート生成ヘルパーの段階的整理。
