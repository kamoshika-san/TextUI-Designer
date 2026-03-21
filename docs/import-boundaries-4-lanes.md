# import 境界（4 レーン）

**チケット**: T-20260321-110（本ファイルを **import ルールの人間向け正本**とする）  
**相互リンク**: 語彙・狙い・「やらないこと」は [architecture-review-F-boundary-roadmap.md](architecture-review-F-boundary-roadmap.md)（**T-112**）を先に読む。

## 目的

- **Shared domain**・**Extension host（アプリ層）**・**WebView runtime**・**Export runtime** の **package-like 境界**を、**import の向き**で明文化する（物理 monorepo 化は不要）。
- **機械チェック**: `src/renderer/*` から `src/exporters/*` への import を ESLint で禁止（第 1 弾・T-110）。詳細は `eslint.config.mjs` のコメント参照。

## 4 レーン（典型パス）

| レーン | 典型パス（例） | 役割 |
|--------|----------------|------|
| **Shared domain** | `src/domain/*`、`src/components/definitions/*`、codec / DSL 型 | DSL 中立・再利用可能な型と不変条件 |
| **Extension host** | `extension.ts`、`src/services/*` | VS Code API・ユースケースオーケストレーション |
| **WebView runtime** | `src/renderer/*` | React / `postMessage` 側のプレゼンテーション |
| **Export runtime** | `src/exporters/*` | 出力形式ごとの差分を吸収する実行層 |

## 許可グラフ（読み手向け・概要）

矢印は「上位から下位／隣接層への依存が自然」という **目安**。既存コードは段階移行中であり、**型の共有**（例: `renderer/types`）は別 ADR（[ADR 0003](adr/0003-dsl-types-canonical-source.md)）で縮小中。

```text
Shared domain
    ↑
Extension host ──(message / ports)──→ WebView runtime
    ↓
Export runtime
```

### 明示的に避けたい向き（方針）

| 禁止のイメージ | 理由 |
|----------------|------|
| **WebView → Extension host** の **直接 import**（サービス具象） | メッセージ経路をすり抜ける結合になる |
| **WebView → Export runtime** の **直接 import** | プレビュー層が出力パイプラインに直結する（責務逆転） |
| **Export runtime → WebView** の **実装 import**（`component-map` 等） | 出力層が UI 実装に依存する（現状レガシー箇所は別チケットで縮退） |
| **domain → VS Code API 具象** | アダプタ層に閉じる |

## ESLint（第 1 弾）

- **対象**: `src/renderer/**/*.ts` / `src/renderer/**/*.tsx`
- **ルール**: `no-restricted-imports` — パターン `**/exporters/**` および相対パス `../exporters` / `../../exporters` 相当を拒否
- **根拠**: 上表「WebView → Export runtime」を機械的に守る（新規違反の混入防止）。

## 次の作業（バックログ）

- Export 側の `renderer/types` 依存を `dsl-types` へ寄せる（T-101 レーンと整合）。
- Extension host と domain の矢印を追加の ESLint で固定する（違反ゼロを確認してから）。

## T-112 との役割分担

- **T-112**（`architecture-review-F-boundary-roadmap.md`）: 境界の **なぜ**・索引・ロードマップ。
- **本ファイル（T-110）**: **どこからどこへ import してよいか**の運用ルールと **第 1 弾の自動検査**。
