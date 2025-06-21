# TextUI Designer 設定ガイド

TextUI Designerの設定について説明します。

## 設定方法

### 1. VS Code設定画面から設定
1. `Ctrl+,` (Windows/Linux) または `Cmd+,` (Mac) で設定を開く
2. 検索ボックスに「textui-designer」と入力
3. 各設定項目を変更

### 2. settings.jsonから直接設定
1. `Ctrl+Shift+P` (Windows/Linux) または `Cmd+Shift+P` (Mac) でコマンドパレットを開く
2. 「Preferences: Open Settings (JSON)」を選択
3. 以下の設定を追加

## 設定項目一覧

### ファイル関連
- `textui-designer.supportedFileExtensions`: 処理するファイル拡張子
  - デフォルト: `[".tui.yml", ".tui.yaml"]`

### プレビュー関連
- `textui-designer.autoPreview.enabled`: 自動プレビュー有効化
  - デフォルト: `true`
- `textui-designer.webview.theme`: WebViewテーマ
  - 選択肢: `"auto"`, `"light"`, `"dark"`
  - デフォルト: `"auto"`
- `textui-designer.webview.fontSize`: WebViewフォントサイズ
  - 範囲: `8` - `32`
  - デフォルト: `14`
- `textui-designer.webview.disableThemeVariables`: VS Codeテーマ変数無効化
  - デフォルト: `true`

### エクスポート関連
- `textui-designer.export.defaultFormat`: デフォルトエクスポート形式
  - 選択肢: `"html"`, `"react"`, `"pug"`
  - デフォルト: `"html"`
- `textui-designer.export.includeComments`: コメントを含める
  - デフォルト: `true`
- `textui-designer.export.minify`: コード最小化
  - デフォルト: `false`

### 診断関連
- `textui-designer.diagnostics.enabled`: 診断機能有効化
  - デフォルト: `true`
- `textui-designer.diagnostics.maxProblems`: 最大診断問題数
  - 範囲: `1` - `1000`
  - デフォルト: `100`
- `textui-designer.diagnostics.validateOnSave`: 保存時診断
  - デフォルト: `true`
- `textui-designer.diagnostics.validateOnChange`: 変更時診断
  - デフォルト: `true`

### スキーマ関連
- `textui-designer.schema.validation.enabled`: JSON Schema検証有効化
  - デフォルト: `true`
- `textui-designer.schema.autoReload`: スキーマ自動再読み込み
  - デフォルト: `true`

### テンプレート関連
- `textui-designer.templates.defaultLocation`: デフォルト保存場所
  - デフォルト: `""`
- `textui-designer.templates.customTemplates`: カスタムテンプレート
  - デフォルト: `[]`

### 開発者向け
- `textui-designer.devTools.enabled`: 開発者ツール有効化
  - デフォルト: `false`

## 設定例

```json
{
  "textui-designer.supportedFileExtensions": [".tui.yml", ".tui.yaml"],
  "textui-designer.autoPreview.enabled": true,
  "textui-designer.webview.theme": "dark",
  "textui-designer.export.defaultFormat": "react",
  "textui-designer.diagnostics.maxProblems": 50,
  "textui-designer.templates.customTemplates": [
    {
      "name": "カスタムフォーム",
      "path": "./templates/custom-form.tui.yml",
      "description": "カスタムフォームテンプレート"
    }
  ]
}
```

## コマンド

### 設定関連コマンド
- `TextUI: 設定を開く`: VS Code設定画面でTextUI Designer設定を開く
- `TextUI: 設定を表示`: 現在の設定をJSONファイルとして表示
- `TextUI: 設定をリセット`: すべての設定をデフォルト値にリセット

## 設定の優先順位

1. ワークスペース設定 (`settings.json`)
2. ユーザー設定 (`settings.json`)
3. デフォルト値

## トラブルシューティング

### 設定が反映されない場合
1. VS Codeを再起動
2. 設定ファイルの構文エラーを確認
3. 設定をリセットしてから再設定

### 設定ファイルが見つからない場合
1. `Ctrl+Shift+P` → 「Preferences: Open Settings (JSON)」
2. 設定ファイルが存在しない場合は自動的に作成される 