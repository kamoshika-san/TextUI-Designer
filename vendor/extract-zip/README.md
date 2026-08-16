# extract-zip（ローカル修正版 2.0.2）

`extract-zip@2.0.1` のドロップイン置換です。公式パッケージは 2020 年以降メンテされておらず、[CVE-2026-56876](https://github.com/advisories/GHSA-jmr9-qjv8-65gv)（シンボリックリンクの経路横断）のパッチ版が npm にありません。

## なぜ vendor するか

- 本リポジトリの `puppeteer-core` 24 は CommonJS で、CI / `engines.vscode` が Node 18/20 を前提にしている
- `puppeteer-core` 25 と `@puppeteer/browsers` 3 は ESM 専用かつ Node 22 以上のため、ここでは上げられない
- `extract-zip` は `@puppeteer/browsers` 2.x 経由の推移依存として残る

そのため `package.json` の `overrides` でこのディレクトリを指す。

## 2.0.1 からの差分

- 展開先ディレクトリの外を指すシンボリックリンク（相対 `../` および絶対パス）を拒否する
- リンク先は字面の `path.resolve` ではなく、既存の中間シンボリックリンクを follow するコンポーネント walk で判定する
- 作成後にターゲットが存在するなら `fs.realpath.native` で再検証し、範囲外なら削除して失敗する
- `mkdir` は既存プレフィックスの realpath が内側であることを確認してから、残りのコンポーネントだけを作る
- 通常ファイルの書き込みは既存シンボリックリンクを follow しない（`lstat` + `O_NOFOLLOW`）
- ターゲットに NUL が含まれる場合は、検証と `fs.symlink` の両方で拒否する
