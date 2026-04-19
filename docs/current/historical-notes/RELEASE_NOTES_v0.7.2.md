## v0.7.2 リリースノート（2026-03-28）

### 概要

v0.7.2 は **Tabs / Divider の export スタイル整合の追加修正**、**依存関係のセキュリティメンテナンス**、**Diff IR 仕様ドキュメントの拡充** を中心にまとめたパッチリリースです。

v0.7.1 で進めた Preview / Export の整合改善を継続しつつ、Tabs の色・境界線まわりの差分を詰め、今後の差分抽出設計を支える Diff IR ガイド群を追加しました。

---

### 主な変更

- **Tabs / Divider の export 整合性を追加改善**
  - `Tabs` の export 色と border の扱いを見直し、Preview との差分をさらに縮めました。
  - `Tabs` / `Divider` の export style contract を更新し、生成出力のぶれを減らしました。
- **依存関係のセキュリティ更新**
  - `serialize-javascript` advisory 対応として依存関係 override を更新しました。
  - 既存のビルドフローを維持しながら、配布物に含まれる依存の安全性を改善しています。
- **Diff IR ドキュメント群を追加**
  - vocabulary / identity / extraction contract / reorder-move / rename-removeadd / similarity matching / extension points を追加しました。
  - 差分抽出と将来の拡張ポイントを文章で固定化し、設計判断の再利用性を高めています。

---

### ドキュメント更新

- `docs/current/historical-notes/RELEASE_NOTES_v0.7.2.md` を追加しました。
- `CHANGELOG.md` に `0.7.2` を追加しました。
- `docs/current/workflow-onboarding/api-compat-policy.md` の release note 参照例を `v0.7.2` を含む形に更新しました。
- `docs/current/workflow-onboarding/LOCAL_INSTALLER.md` の `.vsix` 例示を `0.7.2` に更新しました。
- `docs/current/documentation-governance/documentation-inventory.md` に `v0.7.2` の release note を追加し、棚卸し件数を更新しました。

---

### 確認コマンド

- `npm test`

リリース更新では、`package.json` / `package-lock.json` / `CHANGELOG.md` / 本リリースノートと関連ドキュメント参照を `0.7.2` にそろえています。
