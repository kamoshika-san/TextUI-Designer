# schema.json の `component.oneOf` と `definitions/*` — spec からの正規パイプライン

**1段落サマリ**: 組み込みコンポーネントの **JSON Schema 側の「どの `$ref` を並べるか」** と **`definitions` に各コンポーネント断片が揃っているか**の期待値は、いずれも **descriptor graph（`COMPONENT_DEFINITIONS`）** から導出する。`BUILT_IN_COMPONENT_SPECS` → `buildComponentDefinitionFromSpec` で合成された各行の **`schemaRef`** が一覧の正本であり、`src/services/schema/schema-descriptor-selectors.ts` の `getComponentSchemaRefs()` / `getComponentDefinitionNames()` が **単一の列挙 API** である。`npm run compile` の末尾で `scripts/generate-schemas-from-definitions.cjs` が走り、`schema-component-oneof-builder` の `applyExpectedComponentOneOf` により `schemas/schema.json` の `definitions.component.oneOf` が上書きされ、続けて `schema-consistency-checker` で **descriptor とファイル上の `definitions` キー**が整合する。

## 触ってはいけないパターン（旧分断）

- `schemas/schema.json` の `definitions.component.oneOf` を **手編集だけ**で増減する（`compile` で上書きされる／descriptor とズレる）。
- コンポーネント名の列挙を **manifest や別リストから直接**スキーマ検証に使う（`schema-descriptor-selectors` を経由すること）。

## 関連コード

| 役割 | パス |
|------|------|
| oneOf 配列の組み立て | `src/services/schema/schema-component-oneof-builder.ts` |
| descriptor からの列挙（正本 API） | `src/services/schema/schema-descriptor-selectors.ts` |
| 生成スクリプト（compile 連動） | `scripts/generate-schemas-from-definitions.cjs` |
| compile 後の生成物検証 | `scripts/check-generated-schema-chain.cjs` |
| 読み込み時の整合チェック | `src/services/schema/schema-consistency-checker.ts` |

## メンテ時の手順

1. **意味論・schemaRef**: `src/components/definitions/component-spec.ts`（`builtInSchemaRef`）と `BUILT_IN_COMPONENT_SPECS` 合成経路を更新する。
2. `npm run compile`（内部で `schema.json` / `template-schema.json` が必要に応じて更新され、末尾で生成物整合チェックまで実行される）。
3. `npm test`（`schema-descriptor-consistency` 等で oneOf / definitions が descriptor と一致することを確認）。
