> Status: historical
> Updated: 2026-04-19
> Owner: Maintainer
> Reason: `docs/current/historical-notes` から読者主導線を切り離すため `docs/archive/` へ移設（T-20260419-022）
> Replacement: [現行ドキュメント索引](../current/README.md) 。リリース内容の要約はリポジトリルートの `CHANGELOG.md` を参照。

## v0.7.1 リリースノート（2026-03-28）

### 概要

v0.7.1 は **プレビューとエクスポートのスタイル整合性の安定化**、**プレビューのテーマ切替不整合の修正**、**CSS SSoT の運用ガード強化** を中心にまとめたパッチリリースです。

0.7.0 で進めた DSL / SSoT 整理の土台を保ったまま、実運用でズレやすい Preview / Export の境界と、リリース時に見落としやすい CSS ガードを固めています。

---

### 主な変更

- **プレビューのテーマ保持を修正**
  - DSL ファイル切り替え時に、プレビュー側のテーマ状態が不正にリセットされるケースを修正しました。
  - ファイル移動や編集中の再描画でも、意図したテーマ反映を維持しやすくなりました。

- **Export / Preview のスタイル契約を整合**
  - `Accordion` / `Tabs` / `Table` / `TreeView` / `Form` / `Alert` の export style contract を見直しました。
  - Preview と Export の出力差分を減らし、主要コンポーネントの見た目の一貫性を高めています。

- **CSS SSoT ガードを強化**
  - CSS SSoT 用のメトリクス定義、Contributor 向けチェックリスト、回帰ゲート、CI チェックを追加しました。
  - WebView / Export 間の CSS 重複や fallback 利用の監視を継続しやすくしています。

---

### ドキュメント整備

- `README.md` を canonical docs entry として再構成した流れを踏まえ、セットアップ / テスト / Contributing / ドキュメント運用の導線を継続整備しました。
- `docs/current/workflow-onboarding/SETUP.md`、`docs/current/workflow-onboarding/TESTING.md`、`CONTRIBUTING.md`、ドキュメント棚卸し・運用系ドキュメントの参照整合を更新しました。
- release note / API 互換ガイド / ローカルインストール手順の版番号参照を `v0.7.1` に更新しました。

---

### 保守観点のポイント

- このリリースは新しい DSL コンポーネント追加よりも、**既存の Preview / Export / CSS 境界の安定化** を優先しています。
- 今後の変更でも、スタイル契約や fallback 削減を進める場合は、既存の CSS SSoT チェックと release gate を通す前提で進めてください。

---

### 確認コマンド

- `npm run compile`
- `npm test`

リリース更新では、`package.json` / `package-lock.json` / `CHANGELOG.md` / 本リリースノートと関連ドキュメント参照を `0.7.1` にそろえています。
