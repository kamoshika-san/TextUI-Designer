# ADR 0008: ComponentDef（DSL）と ComponentDefinition（descriptor）の生成・整合の推奨方式

## ステータス

採用（2026-03-22）

## コンテキスト

- **DSL 側**の `ComponentDef`（[ADR 0003](./0003-dsl-types-canonical-source.md)）は YAML 上のコンポーネント記述の型であり、**built-in の kind 名**は `BUILT_IN_COMPONENTS`（`src/components/definitions/built-in-components.ts`）と整合させる。
- **拡張ホスト側**の `ComponentDefinition`（`src/components/definitions/types.ts`）は、補完・プレビュー・export などが参照する **descriptor グラフの1行**であり、[ADR 0004](./0004-component-definition-graph-canonical.md) の「設計正本に近づける」方針の中心になる。
- 手書きの巨大な union・二重テーブル・生成コードのみ、のいずれかに寄せないと、**どこを直せば一貫するか**が再び分岐しやすい。

## 決定（推奨方式）

### 1. 正の生成経路（built-in）

1. **名前の列挙の正本**: `BUILT_IN_COMPONENTS`（順序付き配列）。新規 built-in は **ここに kind を追加**することが最初の入口。
2. **意味論メタの中間モデル**: `ComponentSpec`（`src/components/definitions/component-spec.ts`）。  
   `manifest` のプロパティ説明・`exporter-renderer-definitions` のレンダラ方法・`builtInSchemaRef(name)` による **schemaRef** を合成し、`buildBuiltInComponentSpec` で **1 コンポーネント分の Spec** を組み立てる。
3. **descriptor 行の生成**: `BUILT_IN_COMPONENT_SPECS` を `buildComponentDefinitionFromSpec(spec, CORE_CATALOG_METADATA[spec.kind])` に渡し、**`COMPONENT_DEFINITIONS`** を得る。  
   **カタログ行**（`CORE_CATALOG_METADATA`）はドキュメント用サマリ等の **別テーブル**だが、**kind キーで Spec と結合**される（二重に「別々の真実」を持たない）。

### 2. 「整合」とは何を指すか

- **名前整合**: `BUILT_IN_COMPONENTS` の各要素が `DSL_COMPONENT_KINDS` / `ComponentDef` の built-in 判別と矛盾しない（T-091 系の単一化方針）。
- **schema 整合**: `schemaRef` は `builtInSchemaRef` 経由で JSON Schema の `definitions.<Name>` と対応づける。詳細は既存の **schema / descriptor 一貫性テスト**（`schema-descriptor-consistency` 等）に委ねる。
- **逆向き（移行・デバッグ）**: `buildComponentSpecFromDefinition` は **既存 `ComponentDefinition` から Spec を抽出**するための補助であり、**正の追加フローは上記 1 の順**とする。

### 3. 非スコープ（本 ADR が約束しないこと）

- **JSON Schema からの完全自動生成**や、**ビルド時コードジェン**による `COMPONENT_DEFINITIONS` の置き換えは、**別チケット**で評価する（本 ADR は現行の TypeScript 合成パイプラインを推奨として固定する）。

## トレードオフ（短評）

| 観点 | 採用している中間の姿 | 理由 / 代案との比較 |
|------|----------------------|---------------------|
| **保守性** | 入口を `BUILT_IN_COMPONENTS` + `ComponentSpec` 合成に集約 | 手書きの巨大 `COMPONENT_DEFINITIONS` 配列より変更点が追いやすい。完全な外部 DSL 化は運用コストが増える。 |
| **ビルド複雑さ** | 追加の codegen ステップなし（通常の `tsc` のみ） | コードジェンは CI やテンプレ同期の手間が増える。現規模では TS 合成で十分。 |
| **型精度** | `BuiltInComponentName` と `ComponentSpec` で built-in を限定 | 「文字列のまま」よりズレに気づきやすい。将来の拡張（プラグイン kind）は別 ADR で境界を定義する。 |

## 結果

- **ComponentDef（DSL）** と **ComponentDefinition（descriptor）** の関係を、「名前は built-in 列挙 → Spec 合成 → descriptor 行」という **一方向の推奨パイプライン**として文書化できる。
- [ADR 0004](./0004-component-definition-graph-canonical.md) の「グラフを正本に近づける」と、実装の **実際の生成経路**が突き合わせ可能になる。

## 関連

- [ADR 0003](./0003-dsl-types-canonical-source.md)（DSL 型の正本）
- [ADR 0004](./0004-component-definition-graph-canonical.md)（component definition graph）
- 実装: `src/components/definitions/component-definitions.ts`, `src/components/definitions/component-spec.ts`
- 変更増幅: `docs/current/dsl-ssot-types/change-amplification-dsl.md`
