# T-038: fallback removal PR 向け運用ゲート（準備資料）

**目的**: `HtmlExporter` 互換レーン（`useReactRender === false`）削除 PR を出す前に、[t021-fallback-removal-criteria.md](./t021-fallback-removal-criteria.md) の **C3 / C4 / C5** と **Hard Gate 周り**を満たすための**証跡テンプレ**と**作業分解**を固定する。  
**読み手**: Maintainer / Reviewer / PM  
**関連**: [t017-html-export-lane-options-internal-api.md](./t017-html-export-lane-options-internal-api.md) · [export-fallback-lane-boundary-policy.md](./export-fallback-lane-boundary-policy.md) · `tests/README.md`

---

## 1. `TEXTUI_ENABLE_FALLBACK` 依存の除去対象一覧（削除 PR スコープ案）

| 箇所 | 現状 | 削除 PR での想定 |
|------|------|------------------|
| `src/exporters/html-exporter.ts` | `process.env.TEXTUI_ENABLE_FALLBACK !== '1'` で互換レーンを拒否 | **互換レーン分岐ごと削除**に伴い **env チェックも削除** |
| `src/exporters/export-types.ts` | JSDoc に env 要件の記載 | Primary のみの説明へ更新 |
| `tests/setup.js` | `process.env.TEXTUI_ENABLE_FALLBACK = '1'` を**全テストに注入** | fallback 専用テスト削除後は **行削除**（残す場合は「限定ファイルのみ」方針を別途定義） |
| `.github/workflows/ci.yml` | 複数ジョブで `TEXTUI_ENABLE_FALLBACK: '1'` | **該当 env 行を一括削除** |
| `tests/unit/html-exporter-route-viability.test.js` | gate 未到達時の例外を検証 | **「fallback が存在しない」前提**のアサーションへ置換（詳細は削除設計時に PR 内で列挙） |
| `tests/README.md` | T-019 / setup の説明 | **削除後の挙動**（env 不要）に更新 |

補足: 本一覧は **削除 PR の差分チェックリスト**として使う。実削除は **B 条件（Primary 契約の充足）**が満たされた後のフェーズとする（t021 の A/B と整合）。

---

## 2. migration note（ドラフト・利用者向け）

**対象読者**: 拡張機能をフォークしている開発者、内部ツールで `withExplicitFallbackHtmlExport` を直接 import しているチーム（想定外だが grep で検知）。

1. **本番・既定の HTML エクスポート**は **Primary（React 静的レンダー）のみ**であることは T-010 以降変わらない。互換レーンは **テストと明示 internal ヘルパー**に閉じていた。
2. 互換レーンを **削除**したコミット以降、`useReactRender: false` を渡しても **エクスポート API が受理しない**（または未実装エラー）になる予定。代替は **Primary の出力契約**および **スナップショット／Primary 専用テスト**に寄せる。
3. 旧レーンに依存していたカスタム検証がある場合は、[html-exporter-primary-fallback-inventory.md](./html-exporter-primary-fallback-inventory.md) の Primary 経路と [t021](./t021-fallback-removal-criteria.md) の契約表を参照し、**同等の Primary テスト**を追加する。

---

## 3. rollback policy（削除 PR 向けの具体化）

| シナリオ | 手順 |
|----------|------|
| **merge 直後の不具合（main）** | **revert コミットを最優先**（部分修正より先）。t021 の Rollback policy と同旨。 |
| **リリースタグ後** | 問題深刻度に応じ **直前タグから hotfix**、または revert を **パッチリリース**として早送り。 |
| **互換レーン復活が一時的必要** | 製品方針と合意のうえ **revert または feature フラグ**で再度隔離。**T-019 相当の gate** を復元する場合は env / internal フラグのセットをドキュメント化。 |

削除 PR では **PR 本文に「ロールバックは単一 revert で足りるか」**（ファイル削除の粒度）を明記する。

---

## 4. 削除後 follow-up チケット候補（起票用メモ）

1. **ドキュメント掃除**: `t016` / `t017` / inventory から「fallback 実行パス」の記述を過去形へ。
2. **残 compatibility CSS**: `getFallbackCompatibilityStyleBlock` 自体を削除したうえでの **SSoT メトリクス**整理（t028 完了扱いの最終化）。
3. **観測ログ**: `TEXTUI_HTML_EXPORTER_FALLBACK_LANE_EVENT_ID` を削除した場合の **デバッグ代替**（必要なら Primary 側の観測に寄せる）。
4. **ESLint / 許可リスト**: `useReactRender: false` の許可ファイルリストから fallback 専用条項を削除。

---

## 5. t021 の C3 / C4 / C5 との対応（証跡の置き場）

| t021 条件 | 本資料での充足 |
|-----------|----------------|
| **C3** rollback 手順の確認済み | 上記 **§3** を PR テンプレのチェックボックスにコピーし、Reviewer が読了した旨を PR に記録。 |
| **C4** CHANGELOG / migration note | **§2** を CHANGELOG エントリに短縮転記。長文は本ファイルへリンク。 |
| **C5** follow-up 起票 | **§4** を Vault の `Tasks/` へチケット化し、PR にチケット ID を列挙。 |

---

## 6. 次アクション（削除 PR 着手前）

- [x] t021 **契約棚卸し表**の **Blocker? = yes** がゼロであることを再確認する。 — **2026-04-20 記録**: [t049-fallback-removal-evidence-gate-completion.md](./t049-fallback-removal-evidence-gate-completion.md) §1  
- [x] **A1〜A5 / B1〜B5** の証跡リンクを PR に集約する。 — **2026-04-20 記録**: 上記 **t049**（スナップショット + `t041` / `t045` / `t021` への参照）  
- [ ] 本ファイルの **§1** を元に、削除 PR の差分から **env 行が残っていない**ことを self-check する。 — **削除 PR 実施時**（互換レーン除去の差分が存在して初めて実施）
