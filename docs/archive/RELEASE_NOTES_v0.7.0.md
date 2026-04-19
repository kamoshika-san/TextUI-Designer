> Status: historical
> Updated: 2026-04-19
> Owner: Maintainer
> Reason: `docs/current/historical-notes` から読者主導線を切り離すため `docs/archive/` へ移設（T-20260419-022）
> Replacement: [現行ドキュメント索引](../current/README.md) 。リリース内容の要約はリポジトリルートの `CHANGELOG.md` を参照。

## v0.7.0 リリースノート（2026-03-22）

### 概要

v0.7.0 は **DSL 型の正本整理（`src/domain/dsl-types`）** と、**プレビュー/テーマ切替の応答性改善**、**SchemaManager・WebView・テスト基盤の分離と安定化** を中心に進めたリリースです。  
機能追加よりも、今後の組み込みコンポーネント拡張と保守運用を壊しにくくするための土台整備に重点があります。

---

### 主な改善

- **DSL 型の正本を `src/domain/dsl-types` に集約**
  - `Text` / `Link` / `Breadcrumb` / `Badge` / `Image` / `Icon` / `Progress`
  - `Button`
  - `Form`
  - `layout-compound`
  - `ComponentDef` / `PageDef` / `TextUIDSL` / `DSL_COMPONENT_KINDS`
  - 型の入口を一本化し、`renderer/types` への新規逆流を防ぐガードを追加

- **プレビュー更新とテーマ切替の高速化**
  - theme loader を非同期化
  - CSS-only fast path により、テーマ変更時に不要な YAML 再送を回避
  - update queue を latest-wins に整理
  - queue / deliver / phase の観測ログを追加

- **SchemaManager / WebView のテスト容易性を改善**
  - `SchemaManager` に path / cache / workspace / validator seam を追加
  - preview/update 周辺を責務単位に分離
  - 単体テストの require フック依存を段階的に縮小

---

### 開発者向けのポイント

- **SSoT ガードを強化**
  - DSL 型 import 境界
  - exporter / non-renderer からの逆流防止
  - definitions / descriptor / ComponentDef の整合
  - contributes / command manifest / schema 生成のドリフト検出

- **運用ドキュメントを更新**
  - `README.md`
  - `docs/current/operations/MAINTAINER_GUIDE.md`
  - `docs/current/testing-ci/quality-gate-green-main.md`
  - `docs/current/workflow-onboarding/api-compat-policy.md`
  - `docs/current/workflow-onboarding/adding-built-in-component.md`
  - 各 boundary guide

- **テスト運用の整理**
  - simulated E2E の位置づけを明確化
  - `out/` 前提のユニットテスト運用を明文化
  - theme switching / contract / SSoT 系の回帰チェックを拡充

---

### 互換性と注意点

- 公開コマンド名・主要 CLI / MCP エントリポイントは維持しています。
- 今回の中心は内部整理のため、既存 DSL の大きな破壊的変更は想定していません。
- ただし、**DSL 型の参照先を内部実装で直接持っている開発中ブランチ**では、`src/domain/dsl-types` を正本とする前提に合わせて import を見直してください。

---

### 推奨確認

- `npm run compile`
- `npm test`
- `npm run test:all`

リリース運用では、少なくとも `package.json` / `package-lock.json` / `CHANGELOG.md` / リリースノート / README の版番号・記述差分をまとめてレビューすることを推奨します。
