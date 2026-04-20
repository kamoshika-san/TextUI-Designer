# T-016 Phase 2-A: fallback 関連ユニットテストの棚卸し

**チケット**: T-016  
**前提**: T-010（本番の明示 fallback 0）。本表は **Phase 2-A** 時点の分類の正本。  
**追記（T-20260420-091 / 2026-04-21）**: HtmlExporter 互換レーン撤去後の **現行テスト実態**に追随。

## ファイル名 `*fallback*`（3 → 2 ファイル）

| ファイル（変更後） | 分類 | 備考 |
|--------------------|------|------|
| `tests/unit/html-exporter-fallback-style-lane.test.js` | **必須** | **レーン削除後（T-20260420-001）**は **`buildHtmlDocument` + 任意 `compatibilityCss`** のドキュメント `<style>` 契約のみを検証（ファイル名は履歴由来）。 |
| `tests/unit/heuristic-ambiguity-fallback.test.js` | **必須** | ファイル名の fallback は **diff ヒューリスティック**の `remove-add-fallback` / `ambiguityReason` であり、HTML exporter レーンとは無関係。 |
| ~~`tests/unit/html-exporter-fallback-entry-guard.test.js`~~ | **統合** | **`src/**` の `useReactRender: false` 直書きガード**は `html-exporter-route-viability.test.js` へ移動（経路・ソース衛生を同一ファイルに集約）。 |

## ファイル名に fallback が無いがレーン／契約に関わるもの

| ファイル | 分類 | 備考 |
|----------|------|------|
| `tests/unit/html-exporter-route-viability.test.js` | **必須** | Primary 既定・capture 経路。T-016 で **fallback entry guard** の describe を併設。 |
| ~~`tests/unit/html-exporter-lane-observability.test.js`~~ | **削除済み** | **T-20260420-090 系**: HtmlExporter の fallback **ログ観測専用**テスト。レーン撤去に伴いファイル削除。 |

## 削減結果（メトリクス）

- **削除**: `html-exporter-fallback-entry-guard.test.js`（1 ファイル）
- **残存 `*fallback*` ファイル数**: 2（`html-exporter-fallback-style-lane` · `heuristic-ambiguity-fallback`）

## 関連ドキュメント

- [html-exporter-fallback-shrink-t010.md](./html-exporter-fallback-shrink-t010.md)
