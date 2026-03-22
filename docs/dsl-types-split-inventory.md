# DSL 型（`domain/dsl-types`）構造棚卸し・分割方針（RF1-S1-T1）

## 目的

`dsl-types.ts` を物理分割する前に、**カテゴリ**・**依存の向き**・**循環を避ける境界**を固定し、雑なファイル分割を防ぐ。

## 現行モジュールの位置づけ（2026-03-22）

- **正本**: `src/domain/dsl-types/`（エントリは `index.ts` → 実体は当面 `dsl-types.ts` に集約。RF1-S2 以降で段階的にファイル分割）。
- **レガシー再エクスポート**: `src/renderer/types.ts` は `domain/dsl-types` の thin facade のみ（[ADR 0003](adr/0003-dsl-types-canonical-source.md)）。

## 型のカテゴリ分類

| カテゴリ | 代表型・概念 | 備考 |
|----------|----------------|------|
| **text / display** | `TextVariant`, `TextComponent`, `BadgeComponent`, `ProgressComponent`, … | 読み取り中心・軽い見た目 |
| **form / input** | `InputComponent`, `CheckboxComponent`, `RadioComponent`, `SelectComponent`, `DatePickerComponent`, `FormField`, `FormComponent`, `FormAction` | 入力・検証に関わる束 |
| **layout / container** | `DividerComponent`, `SpacerComponent`, `ContainerComponent`, `AccordionComponent`, `TabsComponent`, `TableComponent`, `TreeViewComponent` | 配置・ネスト・複合 UI |
| **navigation** | `LinkComponent`, `BreadcrumbComponent`, `BreadcrumbItem` | 遷移・階層 |
| **feedback / media** | `AlertComponent`, `ImageComponent`, `IconComponent` | メッセージ・メディア |
| **document** | `PageDef`, `TextUIDSL` | DSL ルート |
| **union / guards** | `ComponentDef`, `ComponentType`, 各 `is*Component`, `isComponentDefValue`, `DSL_COMPONENT_KINDS` | 判別・実行時検証 |

## 依存関係（循環なしの目安）

```
[primitive / token 系の型エイリアス]
        ↓
[単体コンポーネント Props インターフェース]（相互参照なし）
        ↓
ComponentDef（判別ユニオン）
        ↓
PageDef / TextUIDSL
        ↓
型ガード・DSL_COMPONENT_KINDS（built-in 列挙に依存）
```

- **禁止**: カテゴリファイル同士が互いの具象型を import して循環すること。
- **許容**: `ComponentDef` は全カテゴリの union に依存するため、**union 定義は最後の束ねるファイル**に置く（または `component-def.ts` 1 ファイルに集約）。

## 型分割方針表（将来ファイルへのマッピング案）

| 将来ファイル（案） | 収容する型・定数 |
|---------------------|------------------|
| `text-display.ts` | `TextVariant`, `TextSize`, … `TextComponent`, `Badge*`, `Progress*` |
| `form-input.ts` | `Input*`, `Checkbox*`, `Radio*`, `Select*`, `DatePicker*`, `Form*` |
| `layout-container.ts` | `Divider*`, `Spacer*`, `Container*`, `Accordion*`, `Tabs*`, `Table*`, `TreeView*` |
| `navigation.ts` | `Link*`, `Breadcrumb*` |
| `feedback-media.ts` | `Alert*`, `Image*`, `Icon*` |
| `document.ts` | `PageDef`, `TextUIDSL` |
| `component-def.ts` | `ComponentDef`, `ComponentType`, `ExtractComponentProps` |
| `guards.ts` | `is*Component`, `isComponentDefValue`, `DSL_COMPONENT_KINDS`（`built-in-components` 依存） |

**段階的移動**: RF1-S2 以降のチケットで、上表に沿って **1 カテゴリずつ**移し、`index.ts` が再エクスポートするだけの構成にする。

## 「逆に読みにくくなる分割」と回避策

| リスク | 回避策 |
|--------|--------|
| 1 コンポーネントが複数ファイルにまたがり、ジャンプが増える | **カテゴリ単位**でまとめ、細かすぎるファイルは作らない |
| `ComponentDef` とガードの二重定義 | **判別ユニオンとガードは同一モジュールに近接**、または `guards.ts` が単一の情報源 |
| `built-in-components` と `DSL_COMPONENT_KINDS` のズレ | 新コンポーネント追加手順（[adding-built-in-component.md](adding-built-in-component.md)）を守り、`DSL_COMPONENT_KINDS` は `BUILT_IN_COMPONENTS` から導出済みの現状を維持 |

## 関連

- メタ: TextUI-Designer-Doc `Tasks` の RF1（保守ロードマップ）
- 境界: [dsl-types-renderer-types-inventory.md](dsl-types-renderer-types-inventory.md)・`npm run check:dsl-types-ssot`
