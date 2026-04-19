# 補完（IntelliSense）を変えるには — descriptor 正本と編集箇所

**どこを編集すれば補完が変わるか（現行）**

1. **プロパティ名・説明・列挙値（補完候補の中身）**  
   - **編集するファイル**: `src/components/definitions/manifest.ts` の各コンポーネントの `description` と `properties`（**執筆用データ**）。  
   - **合成経路**: `component-definitions.ts` の `buildBuiltInComponentSpec` が `ComponentSpec` に載せ、`COMPONENT_DEFINITIONS` → `componentDescriptorRegistry` → `completion-component-catalog.ts` の `COMPONENT_PROPERTIES` / `COMPONENT_DESCRIPTIONS` へ至る。  
   - **ランタイムの参照窓口**（呼び出し側が触るべき API）: `src/services/completion-component-catalog.ts` 経由の **`COMPONENT_PROPERTIES` / `COMPONENT_DESCRIPTIONS`** と、`DescriptorCompletionEngine`。**JSON Schema をパースして候補を作る実装ではない**（`MAINTAINER_GUIDE.md` の補完節と同じ）。

2. **registry / 契約テスト**  
   - `COMPONENT_DEFINITIONS` と補完カタログの一致は `tests/unit/completion-descriptor-consistency.test.js` で担保する。

**manifest を減らす段階移行（方針）**  
長文の `properties` を別モジュールへ切り出す場合も、**descriptor に載るまでの経路は `buildBuiltInComponentSpec` のみ**に寄せる（二重の「正本」を作らない）。
