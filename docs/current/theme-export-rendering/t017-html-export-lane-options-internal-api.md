# T-017 / T-020: HtmlExporter 互換（fallback）レーン — 内部専用 API

> **履歴（T-20260420-001）**: 以下に記載した **`withExplicitFallbackHtmlExport` / `fallback-lane-options` / `fallback-helper` 経路は削除済み**。現行の HTML export は **Primary のみ**（`t021`・`t038`・`exporter-boundary-guide.md`）。

**チケット**: T-017（内部 API 方針）· **T-020**（`src/exporters/internal/` への物理隔離とテスト経路の一本化）  
**前提**: T-010（本番の明示 fallback 0）、T-016（fallback テスト棚卸し）、T-019（ランタイム Hard Gate）。

## 方針（正本 · アーカイブ）

- **`withExplicitFallbackHtmlExport` / `EXPLICIT_FALLBACK_HTML_EXPORT_OPTIONS`** は **`src/exporters/internal/fallback-lane-options.ts` で定義される**互換レーン用の実装詳細とする（**パッケージの public surface からは export しない**）。
- **アプリコード（CLI / MCP / `src/services` / renderer 等）**から **`src/exporters/internal/**` を直接 import しない**（ESLint `no-restricted-imports` で **error**）。
- **単体テスト**では **`tests/helpers/fallback-helper.js` の `createFallbackOptions(...)` のみ**を経由して互換オプションを構築する（`tests/README.md` 参照）。**`out/exporters/internal/*` をテストから直接 `require` しない**。

## 呼び出し・参照の列挙（リポジトリスナップショット）

| 種別 | パス | 内容 |
|------|------|------|
| **定義** | `src/exporters/internal/fallback-lane-options.ts` | `EXPLICIT_FALLBACK_HTML_EXPORT_OPTIONS` / `withExplicitFallbackHtmlExport` |
| **内部 facade** | `src/exporters/internal/fallback-access.ts` | `__fallbackAccess`（exporter 内部からのみ参照想定） |
| **型 JSDoc** | `src/exporters/export-types.ts` | `ExportOptions` が helper 名を言及（`useReactRender: false` 時の内部利用） |
| **ランタイム文言** | `src/exporters/html-exporter.ts` | 例外メッセージに helper 名を含む（import ではない） |
| **テストヘルパー** | `tests/helpers/fallback-helper.js` | `createFallbackOptions` → `out/exporters/internal/fallback-access` |
| **単体テスト** | `tests/unit/html-exporter-fallback-style-lane.test.js` 等 | 上記ヘルパーのみ使用 |
| **ガード** | `tests/unit/html-exporter-route-viability.test.js` | `src/exporters/internal/fallback-lane-options.ts` を `useReactRender: false` 直書きの **唯一許可ファイル**として参照 |
| **スクリプト** | `scripts/report-react-fallback-usage.cjs` | パターン集計（import ではない） |
| **ドキュメント** | `docs/current/theme-export-rendering/*.md` 他 | 説明上の言及のみ |

**`src/cli/**` · `src/mcp/**` · `src/services/**` からの `src/exporters/internal/**` への import: 禁止（ESLint error）。**

## 関連

- [t021-fallback-removal-criteria.md](./t021-fallback-removal-criteria.md)（**fallback レーン削除の Go/No-Go 正本**）
- [html-exporter-fallback-shrink-t010.md](./html-exporter-fallback-shrink-t010.md)
- [t016-fallback-unit-tests-inventory.md](./t016-fallback-unit-tests-inventory.md)
