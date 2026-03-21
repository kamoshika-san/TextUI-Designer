# contributes.commands / menus（単一ソース）

## 正本

- [`src/services/command-catalog.ts`](../src/services/command-catalog.ts) の `COMMAND_CATALOG`
- 各エントリ: `command`（ID）・`title`（表示名）・任意で `menus`（メニュー掲載先）

## package.json への反映

- `npm run compile` 後、`out/services/command-catalog.js` を読むスクリプトが `package.json` を更新する。
- **`npm run sync:commands`** … `contributes.commands` をカタログ由来で**全面置換**。`contributes.menus` も **`getPackageMenuContributions()` の戻り値で全面置換**（手編集したメニューは残らない）。
- **`npm run check:commands`** … 上記 2 つがビルド成果物と一致するか検証（`menus` はロケーションキーごとに比較）。

## コマンドやメニューを追加するとき

1. `command-catalog.ts` の `COMMAND_CATALOG` にエントリを追加（必要なら `menus` に `location: 'editor/title'` 等）。
2. `npm run sync:commands`
3. `npm run check:commands` と `npm run check:contributes` が通ることを確認。

## 設定（configuration）との関係

- [`configuration-properties` / `config-schema`](./MAINTAINER_GUIDE.md) による `contributes.configuration` とは**別フィールド**のため、互いに上書きしない。

## keybindings

- 現状 `package.json` の `contributes.keybindings` は使っていない。ショートカットを追加する場合は別途 contributes を編集し、必要ならカタログ側に寄せる検討をする。
