# 未宣言 `require()` ガード（T-20260421-032）

## 目的

`src/**/*.ts` 内の `require('パッケージ名')` が、`package.json` の `dependencies` / `devDependencies`（および `optionalDependencies`）に宣言されていない場合に CI で失敗させ、推移依存に頼った偶然の解決を防ぐ。

## 実行

```bash
npm run check:undeclared-requires
```

実装: `scripts/check-undeclared-requires.cjs`

## 許可リスト

次のモジュールは npm 依存として宣言されないため、スクリプト内の `ALLOW` で明示的に許可する。

- **`vscode`**: VS Code 拡張機能ホストが提供（`@types/vscode` は型のみ）。

許可を増やす場合は **理由をコメントで残し**、可能なら `dependencies` への追加を優先する。

## Node 組み込み

`node:` 接頭辞付きおよび Node 組み込みモジュールは対象外。
