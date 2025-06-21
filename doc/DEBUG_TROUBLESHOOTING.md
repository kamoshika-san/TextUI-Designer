# デバッグモード トラブルシューティング

## スキーマファイル読み込みエラー

### 問題
デバッグモードで拡張機能を起動した際に、以下のエラーが発生する場合があります：

```
Problems loading reference 'file:///c%3A/Users/nao20/.vscode/extensions/kamoshika-san.textui-designer-0.0.5-dev/schemas/schema.json': Unable to load schema from 'c:\Users\nao20\.vscode\extensions\kamoshika-san.textui-designer-0.0.5-dev\schemas\schema.json': No content.
```

### 原因
デバッグモードでは、拡張機能のファイル構造が通常のインストール時と異なるため、スキーマファイルのパスが正しく解決されない場合があります。

### 解決方法

#### 1. VSCode設定の修正

`.vscode/settings.json`を以下のように修正してください：

```json
{
    "yaml.schemas": {
        "file:///c%3A/Users/nao20/%E5%AE%9F%E9%A8%93/Doxia/textui-designer/schemas/schema.json": [
            "*.tui.yml",
            "*.tui.json"
        ],
        "file:///c%3A/Users/nao20/%E5%AE%9F%E9%A8%93/Doxia/textui-designer/schemas/template-schema.json": [
            "*.template.yml",
            "*.template.yaml",
            "*.template.json"
        ]
    }
}
```

#### 2. 拡張機能の再ビルド

```bash
npm run compile
npm run package
npm run build-webview
```

#### 3. VSCodeの再起動

1. VSCodeを完全に終了
2. デバッグセッションを再開始
3. 拡張機能を再読み込み

#### 4. スキーマファイルの確認

以下のファイルが存在することを確認してください：

- `textui-designer/schemas/schema.json`
- `textui-designer/schemas/template-schema.json`

#### 5. 手動でのスキーマ再初期化

VSCodeのコマンドパレット（Ctrl+Shift+P）で以下を実行：

```
TextUI: スキーマを再初期化
```

### 予防策

#### 1. 開発時の推奨設定

開発時は、VSCode設定で開発中のスキーマファイルを直接参照することを推奨します：

```json
{
    "yaml.schemas": {
        "${workspaceFolder}/textui-designer/schemas/schema.json": ["*.tui.yml", "*.tui.json"],
        "${workspaceFolder}/textui-designer/schemas/template-schema.json": ["*.template.yml", "*.template.yaml"]
    }
}
```

#### 2. パッケージ化時の確認

拡張機能をパッケージ化する前に、以下を確認してください：

1. `package.json`に`files`セクションが含まれている
2. スキーマファイルが正しくコピーされている
3. `yaml.schemas`設定が正しく定義されている

### ログの確認

デバッグコンソールで以下のログを確認してください：

```
[SchemaManager] スキーマパスを設定: [パス]
[SchemaManager] スキーマファイル存在確認: true/false
[SchemaManager] YAMLスキーマ登録成功
```

### 代替解決方法

#### 1. グローバル設定の使用

VSCodeのグローバル設定でスキーマを定義：

```json
{
    "yaml.schemas": {
        "file:///c%3A/Users/nao20/%E5%AE%9F%E9%A8%93/Doxia/textui-designer/schemas/schema.json": ["*.tui.yml", "*.tui.json"]
    }
}
```

#### 2. ワークスペース設定の使用

プロジェクトの`.vscode/settings.json`でスキーマを定義：

```json
{
    "yaml.schemas": {
        "${workspaceFolder}/textui-designer/schemas/schema.json": ["*.tui.yml", "*.tui.json"]
    }
}
```

### 関連ファイル

- `src/services/schema-manager.ts` - スキーマ管理ロジック
- `schemas/schema.json` - メインスキーマファイル
- `schemas/template-schema.json` - テンプレートスキーマファイル
- `.vscode/settings.json` - VSCode設定ファイル

### 注意事項

- デバッグモードでは、拡張機能のファイルパスが動的に変更される場合があります
- スキーマファイルのパスは、絶対パスまたは相対パスで指定できます
- VSCodeの設定変更後は、ファイルの再読み込みが必要な場合があります 