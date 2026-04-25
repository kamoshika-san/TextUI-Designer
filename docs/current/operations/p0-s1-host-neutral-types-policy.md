# P0-S1-T2: Host 中立型ポリシー（Draft v1）

作成日: 2026-04-25  
対象スプリント: P0 / Sprint 1

## 目的

`vscode` 固有型をアプリ層契約から排除し、VS Code / Obsidian 双方で実装可能な最小抽象を定義する。

## 設計原則

1. **Application 層は `vscode` を import しない。**
2. **Host API は adapter 層で終端させる。**
3. **中立型は「最小に」保つ（過剰抽象を避ける）。**
4. **戻り値型は Host 依存オブジェクトではなく domain 値を優先する。**

## 中立型（命名案）

- `DisposableLike`: `dispose(): void`
- `UriLike`: `toString(): string`, `fsPath?: string`
- `TextDocumentLike`: `uri`, `getText()`, `languageId`, `version`
- `PositionLike`: `line`, `character`
- `CancellationTokenLike`: `isCancellationRequested`
- `CompletionItemLike`: `label`, `kind?`, `detail?`, `insertText?`
- `ConfigChangeEventLike`: `affectsConfiguration(section: string): boolean`
- `PreviewPanelHandle`: `postMessage`, `reveal`, `dispose`

## 変換責務

- VS Code adapter が `vscode.*` → `*Like` に変換。
- Host 非依存サービスは `*Like` のみを受け取る。
- Obsidian adapter 実装時は同じ `*Like` を満たす。

## 禁止事項（Do / Don't）

### Do
- `src/services` の Host 非依存部分で `*Like` 型を使う。
- Host 実装ごとに adapter ファイルを分離する。

### Don't
- 中立層で `import * as vscode from 'vscode'` を追加しない。
- `unknown` で逃げる暫定実装を常態化しない。
- Host イベントオブジェクトを生で横流ししない。

## ガード方針（次スプリント実装）

- ESLint `no-restricted-imports` で中立層からの `vscode` import を禁止。
- CI に `host-boundary` チェックを追加。
- PR テンプレに「Host境界逸脱なし」チェック項目を追加。

## 完了条件（Sprint1）

- 命名案と変換責務がレビュー合意されている。
- P0対象 interface に対して、どの `*Like` を適用するか決まっている。
