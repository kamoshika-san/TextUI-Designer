# T-017: `html-export-lane-options`（互換レーン）内部専用 API

**チケット**: T-017  
**前提**: T-010（本番の明示 fallback 0）、T-016（fallback テスト棚卸し）。

## 方針（正本）

- **`withExplicitFallbackHtmlExport` / `EXPLICIT_FALLBACK_HTML_EXPORT_OPTIONS`** は **`src/exporters/html-export-lane-options.ts` で定義される内部互換用 API** とする。
- **拡張機能本体・CLI・MCP・`src/services` などのアプリコードから直接 `import` しない**（互換 HTML レーンが必要な場合は **別の exporter 内部実装**に集約し、新規呼び出しはレビュー対象）。
- **単体テスト**では、互換レーンを明示するために **`withExplicitFallbackHtmlExport(...)` の利用を許可**する（`tests/README.md` 参照）。

## 呼び出し・参照の列挙（リポジトリスナップショット）

| 種別 | パス | 内容 |
|------|------|------|
| **定義** | `src/exporters/html-export-lane-options.ts` | `EXPLICIT_FALLBACK_HTML_EXPORT_OPTIONS` / `withExplicitFallbackHtmlExport` |
| **型 JSDoc** | `src/exporters/export-types.ts` | `ExportOptions` が helper 名を言及（`useReactRender: false` 時の内部利用） |
| **ランタイム文言** | `src/exporters/html-exporter.ts` | 非推奨ログに helper 名を含む（import ではない） |
| **単体テスト** | `tests/unit/html-exporter-fallback-style-lane.test.js` | `require('../../out/exporters/html-export-lane-options')` |
| **単体テスト** | `tests/unit/html-exporter-lane-observability.test.js` | 同上 |
| **ガード** | `tests/unit/html-exporter-route-viability.test.js` | `src/exporters/html-export-lane-options.ts` を `useReactRender: false` 直書きの唯一許可ファイルとして参照 |
| **スクリプト** | `scripts/report-react-fallback-usage.cjs` | パターン集計（import ではない） |
| **ドキュメント** | `docs/current/theme-export-rendering/*.md` 他 | 説明上の言及のみ |

**`src/cli/**` · `src/mcp/**` · `src/services/**` からの `html-export-lane-options` への import: 現状 0 件**（新規禁止は ESLint `no-restricted-imports` で担保）。

## 関連

- [html-exporter-fallback-shrink-t010.md](./html-exporter-fallback-shrink-t010.md)
- [t016-fallback-unit-tests-inventory.md](./t016-fallback-unit-tests-inventory.md)
