# T-017 / T-020: HtmlExporter 互換（fallback）レーン — 内部専用 API（アーカイブ）

> **履歴（T-20260420-001 / T-20260420-090）**: **`withExplicitFallbackHtmlExport` / `fallback-lane-options.ts` / `fallback-access.ts` / `tests/helpers/fallback-helper.js` / `createFallbackOptions`** は **削除済み**。現行の HTML export は **Primary のみ**。

**チケット**: T-017（内部 API 方針）· **T-020**（`internal/` への物理隔離とテスト経路の一本化）  
**現行の正本**: [`exporter-boundary-guide.md`](../runtime-boundaries/exporter-boundary-guide.md) · [`html-exporter-primary-structure-inventory.md`](./html-exporter-primary-structure-inventory.md) · [`t021-fallback-removal-criteria.md`](./t021-fallback-removal-criteria.md)

---

## 本文はアーカイブ（削除前スナップショット）

以下の表は **互換レーンが存在した時代**の参照関係を残すものであり、**パス・ファイルの多くは現リポジトリに存在しません**。新規作業ではこの表を根拠にしないでください。

| 種別（削除前） | パス（削除前） | 内容（削除前） |
|------|------|------|
| **定義** | `src/exporters/internal/fallback-lane-options.ts` | `EXPLICIT_FALLBACK_HTML_EXPORT_OPTIONS` / `withExplicitFallbackHtmlExport` |
| **内部 facade** | `src/exporters/internal/fallback-access.ts` | exporter 内部からの互換オプション構築 |
| **テストヘルパー** | `tests/helpers/fallback-helper.js` | `createFallbackOptions` |
| **単体テスト** | `tests/unit/html-exporter-fallback-style-lane.test.js` 等 | 互換レーン経由の検証（現行は `buildHtmlDocument` のみ） |
| **ガード** | `tests/unit/html-exporter-route-viability.test.js` | 当時は `internal/fallback-lane-options.ts` を `useReactRender: false` 直書きの許可対象として扱っていた期間あり → **現行は `src/**` に `useReactRender: false` 禁止** |

## 関連

- [t021-fallback-removal-criteria.md](./t021-fallback-removal-criteria.md)
- [html-exporter-primary-fallback-inventory.md](./html-exporter-primary-fallback-inventory.md)
- [t016-fallback-unit-tests-inventory.md](./t016-fallback-unit-tests-inventory.md)
