# `renderer/types` 逆流防止 — レイヤーとガード（RF1-S1-T3）

## ルール（1行）

**共有 DSL 型は `src/domain/dsl-types` を参照する。`src/renderer/types` は `renderer/` 配下（WebView 等）に限定し、ドメイン・サービス・コンポーネント定義から import しない。**

## 機械検査

| 手段 | 役割 |
|------|------|
| `npm run check:dsl-types-ssot` | `domain/dsl-types` / `renderer/types` の import 件数と **非 renderer からの `renderer/types` 違反**を列挙（`scripts/check-dsl-type-imports.cjs`） |
| `tests/unit/renderer-types-non-renderer-import-guard.test.js` | `src/renderer/**` と `tests/**` 以外で `renderer/types` を import していないこと |
| ESLint `no-restricted-imports`（`eslint.config.mjs`） | `src/domain` / `services` / `components` で **`renderer/types` への新規 import を抑止** |

## 棚卸しの正本

- 現況・スナップショット手順: [dsl-types-renderer-types-inventory.md](dsl-types-renderer-types-inventory.md)
- メンテナ向け調査観点: [MAINTAINER_GUIDE.md](MAINTAINER_GUIDE.md)（SSoT import boundary）

## 点検結果（2026-03-22）

- `check:dsl-types-ssot`: 違反 0（ディレクトリ化後も import パターン `domain/dsl-types` は不変）
- ユニットガード・ESLint 設定は上表どおり有効（メッセージのみ `dsl-types.ts` → `dsl-types` に整合）
