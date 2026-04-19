# T-021: fallback renderer 削除条件（正本）

**チケット**: T-021（Vault）  
**読み手**: Maintainer / Developer / Reviewer / PM  
**関連**: [t017-html-export-lane-options-internal-api.md](./t017-html-export-lane-options-internal-api.md) · [t016-fallback-unit-tests-inventory.md](./t016-fallback-unit-tests-inventory.md) · [html-exporter-primary-fallback-inventory.md](./html-exporter-primary-fallback-inventory.md) · [export-fallback-lane-boundary-policy.md](./export-fallback-lane-boundary-policy.md) · [t038-fallback-removal-pr-gate.md](./t038-fallback-removal-pr-gate.md)（**T-038**: 削除 PR 運用ゲート草案） · [t041-fallback-removal-evidence-pack.md](./t041-fallback-removal-evidence-pack.md)（**T-041**: A1 / C1 証跡テンプレ） · [t045-fallback-removal-evidence-structural.md](./t045-fallback-removal-evidence-structural.md)（**T-045**: A2 / A4 証跡テンプレ） · [t049-fallback-removal-evidence-gate-completion.md](./t049-fallback-removal-evidence-gate-completion.md)（**T-049**: 削除 PR 前ゲート Evidence 実填・`t038` §6 記録）

---

## Purpose

- **（達成）** `useReactRender === false` の **HtmlExporter 互換レーン**は **T-20260420-001** で撤去済み。以下は **削除前に満たすべきだった条件**および **残フォロー（ドキュメント・C1 等）**の参照として残す。
- 「**何が満たされたら消すか**」を正本化し、**削除判断の属人化**を防ぐ、という **当初目的**は完了扱い。
- **legacy compatibility lane** は **廃止済み**（Primary のみ）。

**判断の軸（最重要）**: 「削除できる理由」を積み上げるのではなく、**「削除できない理由」（ブロッカー）を先に潰し、残件をゼロにする**こと。

---

## Current status（2026-04-20 · T-20260420-001 反映後）

| 領域 | 状態 | 根拠（例） |
|------|------|------------|
| 本番経路の Primary 化 | **維持** | `capture-command` / provider / preview-capture（T-010 系） |
| HtmlExporter 互換レーン | **削除済み** | `useReactRender: false` → **`[HtmlExporter:FALLBACK_REMOVED]`**（`html-exporter.ts`） |
| `TEXTUI_ENABLE_FALLBACK` | **撤去済み** | `tests/setup.js`・`.github/workflows/ci.yml` から除去 |
| internal helper（旧） | **削除済み** | `fallback-lane-options.ts` / `fallback-access.ts` / `tests/helpers/fallback-helper.js` を削除 |
| `src/**` の `useReactRender: false` 直書き | **ゼロ必須** | `html-exporter-route-viability.test.js` entry guard（`allowedLiteralFiles` は空） |
| Primary-only routing のソース契約 | **テストで固定** | `html-exporter-route-viability.test.js` |

**互換レーンは存在しない**。`buildHtmlDocument` の **`compatibilityCss`** は任意スロットとしてテスト可能（`html-exporter-fallback-style-lane.test.js`）。

---

## Removal criteria

削除 PR に進む前に、**A → B → C の順で**満たすこと（C は運用直前ゲート）。

### A. 構造条件（削除前に必須）

| # | 条件 | 定量・定性 | 証跡の例 |
|---|------|------------|----------|
| A1 | **production runtime path** で明示 fallback エントリが **継続 0** | `npm run report:react-fallback-usage` の **runtime fallback entries = 0** がトレンドで維持 | レポート出力・または CI での定期実行ログ |
| A2 | **helper / 互換オプション**が **internal-only**（パッケージ public から露出しない） | T-020 受け入れと同等 | ESLint 設定・`out/` の export 面、t017 |
| A3 | **`src/**` に `useReactRender: false` 直書きが無い** | **0 ファイル**（ヘルパー削除後） | `html-exporter-route-viability` の fallback entry guard |
| A4 | **互換レーン呼び出しが存在しない** | `withExplicitFallbackHtmlExport` / `createFallbackOptions` **0**（削除後） | grep / ESLint / コードレビュー記録 |
| A5 | **route viability** が **Primary-only** を保証し続ける | `html-exporter-route-viability.test.js` が **緑**のまま維持 | CI ログ |

補足: A3 の「raw が存在しない」は **チケット文言の短縮**であり、実務上の定義は **「許可リスト外に `useReactRender: false` 直書きが無い」**（内部正本モジュールは除外）。

### B. 品質条件（Primary が代替として十分）

| # | 条件 | 説明 |
|---|------|------|
| B1 | **互換レーン単体テストが担保していた意味契約**の分類が完了している | 下記 **契約棚卸し表** が **空欄なく**埋まり、`Product-critical?` / `Can move to Primary?` が判断可能 |
| B2 | **Primary に移管すべき契約**はすべて移管済み | 移管先テスト・または Primary 出力上の断言に移っている |
| B3 | **fallback 専用でしか検証できない契約**について、「**product-relevant か**」の再判定が完了 | 不要と判断したものは **削除候補**として文書化（[export-fallback-lane-boundary-policy.md](./export-fallback-lane-boundary-policy.md) との整合） |
| B4 | **Preview / Export parity** で、**重大差分が未解決でない** | 既知差分は **分類ラベル**付きでインベントリに残し、削除判断時は **承認済み例外**のみ |
| B5 | **fallback でしか正しく出せない built-in コンポーネントが 0 件** | 棚卸し表の **Blocker?** 列で確認 |

### C. 運用条件（削除後に事故らない）

| # | 条件 | 定量（提案） | 根拠 |
|---|------|--------------|------|
| C1 | **直近 N 回の CI**で、**fallback 関連ジョブの失敗が 0** | **N = 10**（main の連続グリーン）を初期提案。リリースサイクルが遅い場合は **「直近 14 日間の scheduled + 全 merge queue 実行」**のどちらか厳しい方 | 単発の緑では再発検知が弱いため |
| C2 | **fallback lane usage report** が **production entries = 0** を安定報告 | `report:react-fallback-usage` を **リリース前チェックリスト**に含める | T-010 以降の正と整合 |
| C3 | **maintainers が rollback 手順を確認済み** | 本書 **Rollback policy** の読了サイン（PR テンプレのチェックボックス等） | インシデント時の手戻り速度 |
| C4 | **CHANGELOG / migration note** が準備済み | 削除 PR に同梱 | 利用者・パッケージ消費者への通知 |
| C5 | **削除後フォローアップチケット**が起票済み | 例: 残 CSS の掃除、ドキュメント deprecate 期限 | 削除後の負債の可視化 |

---

## Evidence required（削除判定時に揃えるリンク・成果物）

- **構造**: A1〜A5 それぞれについて、**コマンド出力・PR リンク・テスト名**のいずれかを 1 行以上で紐付け。
- **品質**: 契約棚卸し表（本書）の **Action** がすべて **Done** または **明示的に延期（理由・期限）**。
- **運用**: C1 の N 回分の **CI run URL** または **内部ダッシュボード**へのリンク。
- **合意**: maintainer review の記録（PR approval / 議事メモ）。
- **C3〜C5（削除 PR 直前）**: [t038-fallback-removal-pr-gate.md](./t038-fallback-removal-pr-gate.md) の **§3（rollback）** / **§2（migration 草案）** / **§4（follow-up 候補）**を PR 本文またはチェックリストに取り込み、リンクを残す（**T-038**）。
- **A1 / C1（継続証跡）**: [t041-fallback-removal-evidence-pack.md](./t041-fallback-removal-evidence-pack.md) の手順・テンプレに従い、削除判断時に **日付付きスナップショット**または **CI 一覧 URL** を追記する（**T-041**）。
- **A2 / A4（構造証跡）**: [t045-fallback-removal-evidence-structural.md](./t045-fallback-removal-evidence-structural.md) の **rg 手順と記録テンプレ**に従う（**T-045**）。
- **削除 PR 前ゲート（集約記録）**: [t049-fallback-removal-evidence-gate-completion.md](./t049-fallback-removal-evidence-gate-completion.md) に **A1 スナップショット**・**A2/A4 判定**・**B/C の扱い**・**`t038` §6 記録**を残す（**T-049**）。

---

## Blockers（いずれかが残存する限り **削除禁止**）

1. **fallback でしか成立しない HTML/CSS 契約**があり、Primary 側に**同等の検証または仕様**が無い。
2. Primary path に **未解決の DOM / style mismatch** があり、互換レーンが**事実上の正**になっている。
3. **capture / export / provider** のいずれかに、**fallback 再侵入余地**（暗黙の `useReactRender: false`、内部モジュール直 import、env 回避）が残っている。
4. テスト上、fallback が **product contract の代替証拠**になっており、Primary だけでは**同じ意味の緑**が出せない。
5. **migration note / 利用者向け文言**が無い（「削除してよいが、何を読めばよいか」が無い）。

---

## Contract inventory（契約棚卸し表）

**凡例**: `Current lane` は **Primary 専用テスト**・**`html-exporter-fallback-style-lane`（`buildHtmlDocument` 契約）**・ガード系を指す。`Blocker?` が **yes** の行が 1 つでも残れば削除不可。

| Contract | Current lane | Product-critical? | Can move to Primary? | Blocker? | Action |
|----------|--------------|-------------------|----------------------|----------|--------|
| Tabs semantic classes（`textui-tabs*` 等） | Primary `html-exporter-primary-tabs-semantic.test.js` + `html-exporter-primary-tabs-divider-composite.test.js` | yes（静的 HTML 契約） | **yes** | **no** | T-033: Tabs+Divider 複合を Primary へ。fallback から Tabs assert 除去済み。 |
| Table semantic classes | Primary `html-exporter-primary-table-semantic.test.js` | yes | **yes**（Primary 完全検証） | **no** | T-030 完了。fallback style lane から Table assert 除去。 |
| Divider + Tabs 複合マークアップ | Primary `html-exporter-primary-tabs-divider-composite.test.js` | medium | **yes** | **no** | T-033 完了。 |
| FormControl 系（Input/Checkbox/Radio/DatePicker の `textui-*`） | Primary `html-exporter-primary-formcontrol-input.test.js` + `html-exporter-primary-formcontrol-remaining.test.js` | yes | **yes** | **no** | T-025 / T-034: 全カテゴリ Primary。fallback から FormControl assert 除去済み。 |
| Alert variant hooks（`data-alert-variant` 等） | Primary `html-exporter-primary-alert-variant.test.js` | yes | **yes** | **no** | T-031: Primary に `data-alert-variant` 付与 + 専用テスト。fallback から Alert assert 除去。 |
| Accordion / TreeView 静的クラス | Primary `html-exporter-primary-accordion-treeview-semantic.test.js` | medium | **yes** | **no** | T-036: Primary で DOM 契約を固定。fallback style lane から assert 除去済み。 |
| **compatibility CSS**（旧 `buildFallbackCompatibilityStyleBlock`） | **`buildHtmlDocument` の任意 `compatibilityCss`**（レーン削除後） | yes（スロットの存在） | **yes** | **no** | T-20260420-001: **builder から互換ブロック生成 API を削除**。WebView CSS が SSoT。[t028](./t028-fallback-compatibility-css-reduction-matrix.md) 参照。 |
| **debug observability**（旧 fallback ログ） | （削除） | low | — | **no** | T-20260420-001: structured log テストは **削除**。Primary の観測は別途設計可。 |
| **route viability guard**（Primary-only / entry guard / T-019 gate） | route-viability tests | **yes** | **no**（削除**後**も Primary 契約として残る） | **no** | fallback 削除後も **ファイル存続**を前提にアサーション更新 |
| CLI capture Primary 既定 | route-viability | yes | **already Primary** | no | 維持 |
| `TEXTUI_ENABLE_FALLBACK` Hard Gate | （削除済み） | — | — | **no** | T-20260420-001: **env・setup・CI から除去**。 |

---

## Decision procedure（最終削除判定フロー）

1. **Criteria document 更新** — 本ファイルの **Current status / Removal criteria** を最新化する。  
2. **Evidence links を埋める** — 「Evidence required」に列挙した形で、PR・CI・レポートへのリンクを付ける。  
3. **blocker = none を確認** — 上記 **Blockers** および棚卸し表の **Blocker? = yes** がゼロであることをチェックリスト化。  
4. **maintainer review** — 少なくとも 1 名の maintainer 承認（Primary オーナー + export オーナーの分割でも可、運用で定義）。  
5. **fallback removal PR 着手** — 実装削除・ESLint・テスト削除は **別 PR** でよいが、**同一リリーストレインで整合**させる。

---

## Rollback policy

- **コード**: `main` 上での問題発生時は **revert コミットを最優先**（部分修正より先に戻す）。  
- **リリース済み**: 互換レーン復活が必要な場合は **直前タグからの hotfix ブランチ**を切り、**T-019 相当の gate** を復元するか、**機能フラグ**で再度隔離する（製品方針と合意の上）。  
- **ドキュメント**: 本ファイルに **「削除を試みた日・PR・ロールバック PR」** を 1 節追記し、再試行条件を更新する。

---

## 削除条件の最小セット（実務メモ）

以下が揃い、かつ **Blockers が空**のとき、**fallback removal PR** に進める（本節はチェックリストの要約）。

1. **production fallback entries = 0** の継続（レポートで確認）。  
2. **helper internal-only 化**完了（T-020 相当を正本とする）。  
3. **product-relevant contract** は Primary 側へ**移管済み**、または **product 非関連**と判定済み。  
4. **fallback-only contract** は「不要」と判定済み、または **後続チケット**に切り出し済み。  
5. **rollback** と **migration note** が準備済み。

---

## 関連ドキュメント

- [html-exporter-primary-fallback-inventory.md](./html-exporter-primary-fallback-inventory.md)
- [html-exporter-fallback-shrink-t010.md](./html-exporter-fallback-shrink-t010.md)
- [tests/README.md](../../../tests/README.md)（Fallback 節）
