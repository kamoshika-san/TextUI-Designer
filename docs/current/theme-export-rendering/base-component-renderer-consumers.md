# `BaseComponentRenderer` の利用者一覧（Vault **T-20260421-025**）

**正本実装**: `src/exporters/legacy/base-component-renderer.ts`  
**目的**: **文字列ベースのコンポーネント HTML 生成**を行う exporter の共通基底。**HtmlExporter は対象外**（Primary-only で `Exporter` を直接実装）。

---

## 継承（`extends BaseComponentRenderer`）

| Exporter | ファイル | 備考 |
|----------|----------|------|
| **ReactExporter** | `src/exporters/react-exporter.ts` | JSX / TSX 向け文字列生成 |
| **PugExporter** | `src/exporters/pug-exporter.ts` | Pug 向け文字列生成 |

---

## `HtmlExporter`（非利用）

| クラス | ファイル | 備考 |
|--------|----------|------|
| **HtmlExporter** | `src/exporters/html-exporter.ts` | **`implements Exporter` のみ**。`renderPageComponentsToStaticHtml` 系 Primary 経路のみ（**T-20260421-022**）。 |

---

## 参照のみ（継承ではない）

| 種別 | ファイル | 内容 |
|------|----------|------|
| 型・コメント | `src/components/definitions/types.ts` | `ExporterRendererMethod` と export 側 dispatch の説明 |
| 定義コメント | `src/components/definitions/exporter-renderer-definitions.ts` | dispatch 対応の注記 |
| スタイル整合 | `src/renderer/token-inline-style-from-definition.ts` | WebView と exporter のトークン挙動の注記 |

---

## 変更時の注意

- **新規の「DSL → HTML 文字列」exporter** を `BaseComponentRenderer` に載せるか、`HtmlExporter` と同様に Primary/React 系へ寄せるかは **境界ポリシー**で判断する（本ファイルは **現状の利用者固定**）。
- **`HtmlExporter` から `legacy/base-component-renderer` を import し直す**変更は **ESLint 禁止**（`eslint.config.mjs` · **T-20260421-026**）。
