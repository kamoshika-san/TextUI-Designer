# WebView 入口での `domain/dsl-types` 直参照 PoC（T-167）

## 目的

`src/renderer/types.ts`（thin facade）を経由せず、WebView エントリ限定で `src/domain/dsl-types.ts` を直接 import した場合に、**ビルド・型・テスト**に問題がないかを確認する。

## 変更範囲（1〜2 ファイル）

| ファイル | 変更内容 |
|----------|----------|
| `src/renderer/webview.tsx` | `TextUIDSL`, `ComponentDef` の import を `./types` → `../domain/dsl-types` |
| `src/renderer/use-webview-messages.ts` | `TextUIDSL` の import を `./types` → `../domain/dsl-types` |

他の `renderer` ファイルは従来どおり `./types` / `../types` のまま（全面置換はしない）。

## 結論

**条件付きで可能** — 本リポジトリの ESLint では、`renderer` から `domain/dsl-types` への import を禁止するルールは **domain / services / components / core** 向けの `renderer/types` 抑止（T-101）に限定されており、**`src/renderer/**` からの domain 直参照はルール上ブロックされない**。`import-boundaries`（T-110）も exporters 向けであり、WebView ランタイムから domain 型を取ることと矛盾しない。

型の正本は同一（`renderer/types` は `export * from '../domain/dsl-types'` のみ）のため、**型の意味は変わらない**。差分は **依存エッジが facade を一本バイパスする**ことのみ。

## 限界・リスク

- **一貫性**: entry だけ直参照し残りは `./types` のため、「renderer 内では常に facade 経由」という運用ルールがある場合は **例外が増える**（コードレビュー・ガイドで明示が必要）。
- **将来の縮退**: `types.ts` 削除を目指す場合、entry を先に直参照に寄せるのは **段階的移行の足がかり**になる一方、**中間状態が長く残る**と読み手の負荷が上がる。
- **循環依存**: 現状 `domain/dsl-types` は renderer に依存しない構造のため問題なし。domain 側が renderer を参照し始めた場合は **再評価が必要**（本 PoC の対象外）。

## 次の分岐（T-168 への入力）

- ADR 0003 / `MAINTAINER_GUIDE` で **「WebView entry は domain 直参照可」** と書くか、**facade 経由に戻す**かを判断する材料にする。
- 受け入れ可能なら、同パターンを `preview-diff.ts` など **別バンドル境界**へ広げるかは別チケットで検討。

## 検証（開発者実施）

- `npm test`
- `npm run lint`

（実行日・ログは開発完了連絡レターおよびコミットメッセージを参照。）
