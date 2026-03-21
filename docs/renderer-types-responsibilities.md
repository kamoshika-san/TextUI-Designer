# `src/renderer/types.ts` の責務分類（T-120 / E-DSL-SSOT）

ADR 0003 の **thin facade 収束**に向け、型をどこに置くかの **残留条件**を固定する。議論の再発を防ぐための一文サマリ用。

## 3 分類

1. **共有 DSL 契約（正本）**  
   - **置き場所**: `src/domain/dsl-types.ts` のみに **interface / union / 型ガード本体**を定義する。  
   - **例**: `TextUIDSL`, `ComponentDef`, 各 `*Component`, `isComponentDefValue`（実装本体）。

2. **Renderer 専用（WebView のみ）**  
   - **置き場所**: 将来 `src/renderer/preview-types.ts` 等へ分離。**`renderer/types.ts` には載せない**のが理想。現状は該当が薄い。  
   - **例**: プレビュー専用の view model（DSL 契約と切り離せるもの）。

3. **互換窓口（再エクスポートのみ）**  
   - **置き場所**: `src/renderer/types.ts` は **`export * from '../domain/dsl-types'` と短いコメント**に限定する（T-117 完了時点）。  
   - **意味**: WebView / 既存 `from './types'` の import パスを壊さず、**実体は domain 一本**。

## 一文ルール

**共有 DSL 型の本体は常に `domain/dsl-types`；`renderer/types` は domain への再エクスポート専用の互換窓口とし、renderer 固有の型だけ将来 `preview-types` へ逃がす。**

## サービス契約ポリシー（T-123）

- `src/types/services.ts` と `src/types/webview.ts` などの**サービス境界契約**は、`renderer/types` を経由せず `domain/dsl-types` を参照する。
- 理由: 拡張ホスト/CLI 側の契約を renderer 実装詳細から分離し、非 renderer レイヤへの依存拡散を防ぐため。

## Exporter 契約ポリシー（T-125）

- `src/exporters/` 配下が消費する **共有 DSL 契約型**（`TextUIDSL`, `ComponentDef`, `FormField` など）は `domain/dsl-types` を正本とする。
- Exporter 固有の補助型は `src/exporters/export-types.ts` や family 内部型に閉じる。
- 方針: **exporter は renderer/types を import しない**。互換窓口が必要な場合でも、非 renderer 側は domain 起点を優先する。

## 参照

- [ADR 0003](adr/0003-dsl-types-canonical-source.md)  
- [dsl-types-renderer-types-inventory.md](dsl-types-renderer-types-inventory.md)
