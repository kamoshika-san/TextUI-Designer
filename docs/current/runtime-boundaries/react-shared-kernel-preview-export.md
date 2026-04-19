# React shared kernel（Preview / Export）境界

Preview（WebView）と Export（React-primary 静的 HTML）が **同じ React レンダリングカーネル**を共有する範囲と、**意図的に分離する境界**を 1 ページに固定する（**T-005**）。  
用語 **React-primary** は Glossary の定義に従う。

## shared kernel の指す範囲（責務）

- **正本の入口**: `renderSharedRegisteredOutput`（`registered-component-kernel` 経由）。built-in / 登録済みコンポーネントの **DOM 断片**を、DSL 断片から生成する。
- **共有される前提**:
  - コンポーネント登録表（`registerBuiltInComponents` 等）と **同一のキー解決**。
  - **同一の props → 同一のマークアップ**（Preview 用の jump ラッパーを除いた **inner markup**）。
- **Export 側の薄いラッパー**: `renderPageComponentsToStaticHtml` は、共有カーネル出力を包む **レイアウト／ドキュメント骨格**に限定し、**コンポーネント本体の意味論は shared kernel に寄せる**（テストで「薄さ」を固定）。

## Preview と Export の分離点（意図的な差分）

- **`__renderContext` / jump-to-DSL**: Preview のみ `textui-jump-target` 等が付く。**parity 比較ではこれらを剥がし**、inner を Export と突き合わせる。
- **WebView 固有**: テーマ適用タイミング・メッセージング・DevTools 等は **拡張ホスト / WebView 境界**（`extension-boundary-guide.md`）側の責務。
- **Exporter のフォールバック系**: Primary と fallback の正しさは **`exporter-boundary-guide.md`** が正本（本書では再定義しない）。

## 変更してよい / 原則触らない

| 変更してよい（例） | 原則触らない／慎重に（accidental coupling 回避） |
|---|---|
| 新 built-in の **DSL→DOM** 契約を shared kernel に実装し、**Preview/Export 両方で同じ結果**になるよう保証する | **Preview だけ**に副作用のある分岐を shared kernel に持ち込まない |
| **jump ラッパー除去**に整合するよう、Preview 専用 class の命名・付与場所を整理する（parity テストとセット） | `renderPageComponentsToStaticHtml` を **厚く**してコンポーネント意味をそこに逃がさない |
| テーマ **トークン解決**のバグ修正で、Preview の CSS 変数と Export の変数表が **再び一致**するようにする（下記 theme-vars 契約） | Export-only の表現ゆれを **shared kernel で吸収**しない（Primary / 互換レーンの責務と混線） |

## `react-ssot-check`（parity レーン）の対象範囲

`npm run react-ssot-check` は次の **2 ファイルのみ**を実行する（`package.json` 参照）。

### 1) `tests/unit/shared-kernel-preview-export-parity.test.js`

- **保証する**:
  - 代表 DSL 断片について、`renderSharedRegisteredOutput` の **Export 経路**と **Preview 経路（jump 除去後）**の **静的マークアップが一致**すること。
  - `renderPageComponentsToStaticHtml` の出力が、共有カーネル出力を並べた結果と **一致**すること（**薄いラッパー**の維持）。
- **保証しない**:
  - **全 DSL 網羅**や **フォールバック HTML レーン**の一致。
  - WebView の **実行時挙動**（イベント・状態管理・遅延ロード等）。
  - **Tabs/Accordion 等**の再帰内で Preview のみ付く jump 付き木そのものの同一性（**inner に正規化して比較**する前提）。

### 2) `tests/unit/react-theme-vars-preview-export-contract.test.js`

- **保証する**:
  - マージされたテーマ YAML について、**Preview `ThemeManager` が生成する CSS 変数マップ**と、**Export 側 `buildThemeVariables` の結果**が **deep 等価**であること（代表ケース）。
  - `buildThemeStyleBlock` 経由のスタイルブロックと整合する変数集合の一致（ファイル内アサーションに従う）。
- **保証しない**:
  - **全テーマファイル**・**全トークン組み合せ**の網羅。
  - **非 React** exporter や **fallback** レーンのテーマ挙動。

## 関連ドキュメント

- [VS Code 拡張境界ガイド](./extension-boundary-guide.md)
- [Exporter 境界（Primary / fallback）](./exporter-boundary-guide.md)
- [Glossary（React-primary / parity 用語）](../workflow-onboarding/GLOSSARY.md)
