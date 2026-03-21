# BaseComponentRenderer のディスパッチ接続図（T-069）

## 概要

エクスポート（HTML / Pug / React 等）で DSL コンポーネントを文字列に落とす経路のうち、**組み込みコンポーネント名 → 実装メソッド**までを一枚にまとめる。

## データの流れ

```text
COMPONENT_DEFINITIONS（component-definitions.ts）
        │
        ▼
componentDescriptorRegistry（component-descriptor-registry.ts）
 ・ list() / get(name)
 ・ getExporterHandlerKey(name) → exporterRendererMethod（= ExporterRendererMethod）
        │
        ▼
BaseComponentRenderer.initializeHandlers()（base-component-renderer.ts）
 ・ 各定義 def について componentHandlers.set(def.name, (props, key) =>
       dispatchExporterRenderer(method, props, key))
        │
        ▼
renderComponent / renderFormField / renderFormAction
 ・ decodeDslComponentUnion（T-181）→ kind / props（Text・Button は narrow）
 ・ 組み込みは componentHandlers.get(kind) でハンドラ解決
        │
        ▼
dispatchExporterRenderer(method, props, key)
 ・ EXPORTER_RENDERER_DISPATCH[method](this, props, key)
 ・ （旧: switch (method) … — T-069 第1スライスでテーブル駆動へ）
        │
        ▼
各 renderXxx（HtmlExporter / PugExporter / ReactExporter の具象実装）
```

## 関連ファイル

| 役割 | パス |
|------|------|
| メソッド名の型（SSOT） | `src/components/definitions/types.ts` の `ExporterRendererMethod` |
| 組み込みの rendererMethod + token 既定 | `src/components/definitions/exporter-renderer-definitions.ts` |
| ディスパッチ表（ランタイム） | `BaseComponentRenderer.EXPORTER_RENDERER_DISPATCH` |
| 取りこぼし検知テスト | `tests/unit/dispatch-exporter-renderer-coverage.test.js` |

## 次スライスで削る分岐

- **いま**: `EXPORTER_RENDERER_DISPATCH` は `renderXxx` 本体と**二重**（メソッド追加時は表と本体の両方が必要）。
- **次**: 表を **生成コード**または **`BUILT_IN_EXPORTER_RENDERER_DEFINITIONS` からの合成**に寄せ、型・定義・ディスパッチの更新点を1か所に近づける。
