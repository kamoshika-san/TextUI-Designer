> Status: historical
> Updated: 2026-04-19
> Owner: Maintainer
> Reason: `docs/current/historical-notes` から読者主導線を切り離すため `docs/archive/` へ移設（T-20260419-022）
> Replacement: [現行ドキュメント索引](../current/README.md) 。リリース内容の要約はリポジトリルートの `CHANGELOG.md` を参照。

# Application ユースケース層 — スパイクメモ（T-099）

## 目的

レビュー E Structural にある **UseCase 境界**を、**1 本のユースケース**に絞って試すための範囲案と、採用時のディレクトリ案。

## 候補ユースケース（いずれか 1 本でスパイク）

| 候補 | 入力（概念） | 出力（概念） | VS Code 依存 |
|------|----------------|----------------|--------------|
| **OpenPreview** | ドキュメント参照・設定スナップショット | プレビュー WebView 識別子 or エラー | `window.createWebviewPanel` は **adapter** のみ |
| **ExecuteExport** | ドキュメント・フォーマット | 書き込みパス or バッファ | `workspace.fs` / ダイアログは adapter |
| **ValidateDocument** | テキスト・パス | 診断コレクション | なし（純粋に寄せやすい） |

## 推奨スパイク順

1. **ValidateDocument** または **OpenPreview** のどちらか **1 つ**を、**`src/application/`（新規）** に `function` または `class` として切り出す試作。
2. 既存の **Command / Service** からは **adapter**（`src/vscode-adapters/` 等の命名は別 ADR）が `vscode` API を呼ぶ。
3. **やらないこと**: 全コマンドのユースケース化・`ServiceFactory` の全面置換（別チケット）。

## 採用時のディレクトリ案（仮）

- `src/application/usecases/` — ユースケース本体（vscode を import しない）
- `src/application/ports/` — 必要なら出力ポート（ファイル書き込み等）
- 既存サービスは **段階的に**ユースケースから呼ぶか、薄いファサードを挟む

## 次スプリントで PM が判断する材料

- 本メモと **1 ファイルの試作**があれば、スコープ拡大の可否を判断可能。
- OpenPreview は WebView 状態機械（T-093）と境界が隣接するため、**ValidateDocument 先行**の方が依存が少ない場合あり。
