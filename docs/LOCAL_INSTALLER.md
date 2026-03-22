# ローカル検証用インストーラー（.vsix）

## 概要

VS Code 拡張をマーケットプレースに公開せず、ローカルでインストールして検証するための .vsix パッケージの作り方とインストール方法です。

## .vsix のビルド

以下を実行します。

```bash
npm run package:vsix
```

このコマンドは次を順に実行します。

1. `npm run package` … Webpack で拡張をビルド（`out/` に出力）
2. `npm run build-webview` … Vite で WebView をビルド（`media/` に出力）
3. `npx @vscode/vsce package` … .vsix を生成（dependencies を同梱）

成功するとプロジェクトルートに `textui-designer-<version>.vsix` が作成されます  
（例: 現在の `package.json` が `0.7.0` の場合は `textui-designer-0.7.0.vsix`）。

### 生成された VSIX 名の確認

PowerShell:

```powershell
$version = (Get-Content package.json | ConvertFrom-Json).version
"textui-designer-$version.vsix"
```

bash:

```bash
node -p "'textui-designer-' + require('./package.json').version + '.vsix'"
```

## ローカルへのインストール

### 方法1: コマンドパレットから

1. VS Code で `Ctrl+Shift+P`（macOS は `Cmd+Shift+P`）でコマンドパレットを開く
2. 「Extensions: Install from VSIX...」を選択
3. ビルドした `.vsix` ファイルを指定

### 方法2: コマンドラインから

```bash
code --install-extension "<プロジェクトルート>/textui-designer-<version>.vsix"
```

Windows (PowerShell) 例:

```powershell
$version = (Get-Content package.json | ConvertFrom-Json).version
code --install-extension ".\textui-designer-$version.vsix"
```

（パスは環境に合わせて変更してください。）

## アンインストール

拡張機能ビューで「TextUI Designer」をアンインストールするか、コマンドラインで:

```bash
code --uninstall-extension kamoshika-san.textui-designer
```

## 注意

- `.vsix` は `.gitignore` に含まれており、リポジトリにはコミットされません。
- 再ビルドする場合は `npm run package:vsix` を再度実行してください。
- `code` コマンドが使えない場合は、VS Code の「Shell Command: Install 'code' command in PATH」を実行して有効化してください。
