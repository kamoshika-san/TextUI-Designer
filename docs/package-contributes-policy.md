# `package.json` contributes 方針（カテゴリ・生成・設定の分離）

## 目的

- `contributes`（`configuration` / `commands` / `menus` / `snippets` / `yaml.schemas` 等）が **境界なく肥大化**すると、整合チェック・レビュー負荷が上がる。
- 本ドキュメントは **方針と現状スナップショット**を示し、次に **codegen やビルド統合**を切る際の判断材料にする（**実装は別チケット**）。

## 原則

1. **カテゴリ別の正本** — 論理グループ（例: WebView・Export・診断・MCP・Performance）ごとに、ソースまたは生成元を分け、可能なら **`npm run sync:*` / `check:*` と同じ線**に乗せる。
2. **feature flag とユーザー向け設定の分離** — 開発者向けトグル（例: `devTools`）と、利用者が日常的に触る既定値（例: export 既定形式）は **説明文と既定値のポリシー**を混同しない。
3. **ユーザー向け `configuration` の追加**は、**説明・既定値・型**が揃ったうえで **設定キー命名規則**（`textui-designer.<領域>.<名前>`）に従う。

## 現状スナップショット（主要セクション）

| セクション | 内容の要約 |
|------------|------------|
| `contributes.configuration` | ユーザー向け設定。サブカテゴリ例: **コア**（拡張子・自動プレビュー）／**WebView**／**Export**／**Diagnostics**／**Schema**／**Templates**／**Performance**（デバウンス・キャッシュ・メモリ系）／**MCP**。 |
| `contributes.commands` | コマンドパレット用。プレビュー・エクスポート・設定・スキーマ・パフォーマンス／メモリ系など。**メニューと同期**は `npm run sync:commands` 系で担保。 |
| `contributes.menus` | エディタタイトル等。YAML 編集時のナビゲーション群。 |
| `contributes.snippets` | YAML/JSON 用スニペットパス。 |
| `contributes.yaml.schemas` | `*.tui.yml` / テーマ / テンプレートの JSON Schema 割当。 |

## 将来の codegen（採用時）

- **設定**: 既存の `sync:configuration` / `check:configuration` と同様に、**単一の生成元**（例: `src/config/configuration-properties.ts` 周辺）から `package.json` へ寄せる。
- **commands**: `sync:commands` / `check:commands` のラインに揃える。
- **menus / snippets / yaml.schemas** — `check:contributes` で破綻を検知し、追加時は **どのカテゴリか**を PR で明示する。

## 参照

- `package.json` の `contributes`
- `docs/MAINTAINER_GUIDE.md`（変更種別別のクイックスタート表）
- `scripts/check-contributes-integrity.cjs`
