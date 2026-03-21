# import 境界（4 レーン）— プレースホルダー（T-110 作業用）

**チケット**: T-20260321-110（本ファイルを **import ルールの正本**として育てる）  
**相互リンク**: 語彙・狙い・「やらないこと」は [architecture-review-F-boundary-roadmap.md](architecture-review-F-boundary-roadmap.md)（**T-112**）を先に読む。

## 目的

- **Shared domain**・**Extension host（アプリ層）**・**WebView runtime**・**Export runtime** の **package-like 境界**を、**import の向き**で明文化する（物理 monorepo 化は不要）。
- 本稿は **第 0 スライス**: レーン名と **意図する禁止の方向**を固定し、T-110 の本実装（ESLint 等）で具体ルールに落とす。

## 4 レーン（概要）

| レーン | 典型パス（例） | 狙い |
|--------|----------------|------|
| **Shared domain** | `src/domain/*`、`src/components/definitions/*`、codec / DSL 型 | DSL 中立・再利用可能な型と不変条件 |
| **Extension host** | `extension.ts`、`src/services/*` | VS Code API・ユースケースオーケストレーション |
| **WebView runtime** | `src/renderer/*` | React / `postMessage` 側のプレゼンテーション |
| **Export runtime** | `src/exporters/*` | 出力形式ごとの差分を吸収する実行層 |

## 禁止矢印（暫定・議論用）

詳細な ESLint ルールは **未導入**。方針として **次を避けたい**:

- **WebView → Extension host の直接 import**（メッセージ経路を介さない結合）
- **Export runtime → WebView**（責務逆転）
- **domain から VS Code API 具象**への依存

## 次の作業（T-110）

- ディレクトリ単位の **許可グラフ**を 1 枚にし、**ESLint import 制限の第 1 弾**（少なくとも 1 本の禁止矢印）を入れる。
- 本ファイルと [architecture-review-F-boundary-roadmap.md](architecture-review-F-boundary-roadmap.md) の **用語を揃え**、MAINTAINER 索引から辿れる状態を維持する。
