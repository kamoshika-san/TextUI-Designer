# ビルトインコンポーネント追加の修正箇所（チェックリスト）

新しい **組み込みコンポーネント** を追加するときに触る主なファイル・手順の入口。**5 要素を 1 セットとする契約**は [component-add-contract.md](component-add-contract.md)（T-055）。ここは **迷わず一覧**できることを目的とする。

## 前提

- 型・descriptor・スキーマ・プレビュー・エクスポートの **いずれかだけ更新すると** 実行時・CI・補完で不整合になる。
- より詳しい **change amplification** の説明は [change-amplification-dsl.md](change-amplification-dsl.md) を参照。
- SSoT の正本と互換レイヤ方針は [adr/0003-dsl-types-canonical-source.md](adr/0003-dsl-types-canonical-source.md) を参照。

## DSL 型追加の最短フロー（SSoT）

1. `src/domain/dsl-types.ts` を先に更新（型の正本）。
2. `src/renderer/types.ts` は thin facade を維持し、型本体を追加しない。
3. `src/renderer/**` 外で `renderer/types` import を増やさない。
4. 変更後に SSoT ガードを実行:
   - `npx mocha --grep "renderer/types|SSoT eslint restriction scope guard" tests/unit`
   - `npx eslint "src/core/**/*.{ts,tsx}" "src/exporters/**/*.{ts,tsx}" "src/cli/**/*.{ts,tsx}" "src/utils/**/*.{ts,tsx}" "tests/**/*.{js,ts,tsx}"`

### 型追加テンプレ（コピペ用）

新規型追加時は、以下を PR 説明にそのまま貼り付けてチェックする。

- [ ] `src/domain/dsl-types.ts` を最初に更新した
- [ ] `src/renderer/types.ts` に型本体を追加していない（thin facade 維持）
- [ ] `src/renderer/**` 外で `renderer/types` の新規 import を追加していない
- [ ] 必要に応じて `component definitions` / `schema` / `exporters` を更新した
- [ ] `npx mocha --grep "renderer/types|SSoT eslint restriction scope guard" tests/unit` を実行した
- [ ] `npx eslint "src/core/**/*.{ts,tsx}" "src/exporters/**/*.{ts,tsx}" "src/cli/**/*.{ts,tsx}" "src/utils/**/*.{ts,tsx}" "tests/**/*.{js,ts,tsx}"` を実行した

## チェックリスト（推奨順）

1. **`src/components/definitions/built-in-components.ts`**
   - `BUILT_IN_COMPONENTS` 配列にコンポーネント名を追加。
2. **`src/domain/dsl-types.ts`**
   - `DSL_COMPONENT_KINDS` に同じ名前を追加。
   - `ComponentDef` の union および `*Component` 型・型ガードを追加。
3. **`src/components/definitions/types.ts`**
   - コンポーネント定義用の型（プロパティ・descriptor 用）を追加。
4. **`src/components/definitions/exporter-renderer-definitions.ts`**
   - `previewRendererKey` / `exporterRendererMethod` などのレンダラ定義を追加。
5. **`src/components/definitions/component-definitions.ts`**
   - `COMPONENT_DEFINITIONS` への合成（`BUILT_IN_COMPONENTS` からマップ）。
6. **スキーマ**
   - `schemas/` 配下の生成物は `npm run compile` 時に更新される（`scripts/generate-schemas-from-definitions.cjs` 等）。`COMPONENT_DEFINITIONS` の `schemaRef` と `components` の oneOf が一致すること。
7. **WebView プレビュー**
   - `src/renderer/component-map.tsx` にレンダラを登録。
   - 必要に応じて `src/renderer/components/` に TSX を追加。
8. **トークン由来のスタイル**
   - `tokenStyleProperty` を使う場合は `src/components/definitions/token-style-property-map.ts` と `src/renderer/token-inline-style-from-definition.ts` の整合を確認。
9. **エクスポート**
   - `src/exporters/` 側の該当メソッド（`base-component-renderer` 等）に分岐を追加。
10. **検証**
    - `npm run compile` → `npm test`（必要なら `npm run test:all`）。
    - 機械系: `tests/unit/dsl-types-descriptor-sync.test.js`、`component-definitions` 系の不変条件テストが通ること。

## 関連ドキュメント

- [component-add-contract.md](component-add-contract.md) — 追加時の契約（descriptor / schema / preview / exporter / tests の 1 セット）
- [change-amplification-dsl.md](change-amplification-dsl.md) — DSL の増幅箇所とテストの説明
- [registry-compat-layer-policy.md](registry-compat-layer-policy.md) — registry 互換レイヤの運用（新規は正本へ）
- [adr/0003-dsl-types-canonical-source.md](adr/0003-dsl-types-canonical-source.md) — `domain/dsl-types` 正本化と `renderer/types` thin facade 方針
- [../.github/PULL_REQUEST_TEMPLATE.md](../.github/PULL_REQUEST_TEMPLATE.md) — PR 時の SSoT 影響チェック
