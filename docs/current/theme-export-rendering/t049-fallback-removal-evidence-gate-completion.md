# T-049: fallback 削除 PR 前ゲート — Evidence 実填・`t038` §6 記録

**正本の位置づけ**: [t021-fallback-removal-criteria.md](./t021-fallback-removal-criteria.md) の **Evidence required** および [t038-fallback-removal-pr-gate.md](./t038-fallback-removal-pr-gate.md) **§6** の充足記録（**互換レーン本体のコード削除は含まない**）。  
**日付（記録）**: 2026-04-20  
**注**: Vault の **T-048**（2026-03-21・別エピック）は本ドキュメントの **T-049**（theme-export）と無関係。

---

## 1. `t021` 契約棚卸し表 — Blocker? = **yes** の再確認

| 再確認内容 | 結果 |
|------------|------|
| 契約表の **Blocker? = yes** の行が存在しない | **0 件**（`t021` §Contract inventory 当該列を 2026-04-20 時点で照合） |

---

## 2. 構造 Evidence（§A）

### A1 — production runtime path の明示 fallback

| 項目 | 証跡 |
|------|------|
| `npm run report:react-fallback-usage` | **runtime fallback entries: 0**（下記スナップショット） |

**スナップショット（2026-04-20 ローカル実行）**

```text
runtime fallback entries: 0
fallback helper definitions: 1
primary-default routes: 2
fallback execution test files: 2
fallback governance files: 4
explicit false literals in execution tests: 4
helper calls in runtime source: 0
primary-default markers: 1

runtime fallback entry files: 0
fallback helper files: 1
- src/exporters/internal/fallback-lane-options.ts
primary-default route files: 2
- src/cli/provider-registry.ts
- src/utils/preview-capture/html-preparation.ts
fallback execution test files: 2
- tests/unit/html-exporter-lane-observability.test.js
- tests/unit/html-exporter-fallback-style-lane.test.js
fallback governance files: 4
- tests/unit/html-exporter-route-viability.test.js
- tests/README.md
- docs/current/theme-export-rendering/html-exporter-primary-fallback-inventory.md
- docs/current/theme-export-rendering/html-exporter-fallback-shrink-t010.md
```

### A2 / A4 — 手順正本と記録

- **手順**: [t045-fallback-removal-evidence-structural.md](./t045-fallback-removal-evidence-structural.md)
- **A2（internal-only）**: `src/**/*.ts` における `withExplicitFallbackHtmlExport` の**実呼び出し**は **`src/exporters/internal/fallback-lane-options.ts` の定義**および **`internal/fallback-access.ts` の橋渡し**に収まる。`html-exporter.ts` / `export-types.ts` は **JSDoc・エラーメッセージ・型コメント**のみ。
- **A4（テスト閉包）**: `createFallbackOptions(` の **`tests/**/*.js` ヒット**は次の 4 のみ — `tests/helpers/fallback-helper.js`（定義）+ `html-exporter-fallback-structured-log.test.js` + `html-exporter-lane-observability.test.js` + `html-exporter-route-viability.test.js`。

| 日付 | A2 要約 | A4 要約 | 判定 |
|------|---------|---------|------|
| 2026-04-20 | 実行経路は internal + テストヘルパー | 上記ユニットのみ | **PASS** |

### A3 / A5 — テスト正本

| 条件 | 証跡（ファイル） |
|------|------------------|
| A3 許可リスト外の `useReactRender: false` 直書きが無い | `tests/unit/html-exporter-route-viability.test.js`（`allowedLiteralFiles` ガード） |
| A5 route viability / Primary-only | 同上 + `html-exporter-route-viability.test.js` の CI 実行ログ（削除 PR 時に URL を追記） |

---

## 3. 品質 Evidence（§B）

| 項目 | 記録 |
|------|------|
| B1〜B5 | **契約棚卸し表**（`t021`）の各行 **Action** が T-010〜T-046 の完了記述と整合し、**Blocker? = yes が存在しない**ことをゲート時点で確認済み（詳細は `t021` 正本）。 |

---

## 4. 運用 Evidence（§C）— 本チケットで満たす範囲

| 条件 | 本記録での状態 | 削除 PR マージ時に追加すること |
|------|----------------|--------------------------------|
| **C1** 直近 N 回 CI | **テンプレ準備済み**（`t041` の CI 一覧記法に従い、**main の連続グリーン**の URL を PR 本文へ） | **N = 10**（`t021` 提案）の run URL を貼付 |
| **C2** usage レポート | 本書 **§2 A1** のスナップショット | リリース前チェックリストへの組み込みは運用側 |
| **C3** rollback 読了 | `t038` **§3** + `t021` **Rollback policy** をゲート完走時に参照済み | PR テンプレチェックボックスで署名 |
| **C4** migration / CHANGELOG | `t038` **§2** を正として削除 PR で短文化 | 削除 PR に CHANGELOG エントリ |
| **C5** follow-up 起票 | `t038` **§4** の候補を製品バックログへ起票（**削除 PR マージ後**でよい） | PR に follow-up チケット ID を列挙 |

---

## 5. `t038` §6（削除 PR 着手前）— 記録

| # | 項目 | 状態 |
|---|------|------|
| 1 | `t021` 契約表 **Blocker? = yes** がゼロ | **済**（本書 §1） |
| 2 | **A1〜A5 / B1〜B5** の証跡を PR に集約可能な形で固定 | **済**（本書 + `t021` / `t041` / `t045` リンク） |
| 3 | `t038` **§1** に基づき、削除 PR 差分で **env 行が残っていない**ことの self-check | **未実施（削除 PR 時）** — 本ゲートでは §1 を **読了・差分対象の列挙完了**までとする |

---

## 6. 関連リンク

- [t021-fallback-removal-criteria.md](./t021-fallback-removal-criteria.md)
- [t038-fallback-removal-pr-gate.md](./t038-fallback-removal-pr-gate.md)
- [t041-fallback-removal-evidence-pack.md](./t041-fallback-removal-evidence-pack.md)
- [t045-fallback-removal-evidence-structural.md](./t045-fallback-removal-evidence-structural.md)
