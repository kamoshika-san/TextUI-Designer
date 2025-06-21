# TextUI Designer テストスイート

このディレクトリには、TextUI Designer拡張の包括的なテストスイートが含まれています。

## テストの種類

### 1. 回帰テスト (`regression/`)
プレビュー画面からのエクスポート機能に関する回帰テストです。

**ファイル:**
- `export-from-preview.test.js` - 基本的な回帰テスト
- `export-regression-suite.js` - 統合回帰テストスイート

**テスト内容:**
- プレビュー画面をアクティブにした状態でのエクスポート機能
- WebViewがアクティブな時のエクスポート処理
- 複数ファイルの切り替え時の正しいファイルエクスポート
- エラーハンドリングの動作確認

### 2. 単体テスト (`unit/`)
個別のサービスやクラスの単体テストです。

**ファイル:**
- `export-service.test.js` - ExportServiceの単体テスト
- `webview-manager.test.js` - WebViewManagerの単体テスト

**テスト内容:**
- ファイルパス処理の動作確認
- lastTuiFileの管理
- メッセージ処理の動作
- エラーハンドリング

### 3. 統合テスト (`integration/`)
複数のサービス間の連携をテストします。

**ファイル:**
- `command-manager.test.js` - CommandManagerの統合テスト

**テスト内容:**
- コマンドの登録と実行
- エクスポートコマンドの処理
- 複数コマンドの連続実行
- パフォーマンステスト

### 4. E2Eテスト (`e2e/`)
実際のVS Code環境でのエンドツーエンドテストです。

**ファイル:**
- `export-from-preview-e2e.test.js` - プレビュー画面からのエクスポート機能のE2Eテスト

**テスト内容:**
- 実際のWebViewとの連携
- ユーザー操作のシミュレーション
- 複雑なシナリオのテスト
- パフォーマンステスト

## テストの実行方法

### 全テストの実行
```bash
npm run test:all
```

### 個別テストの実行
```bash
# 回帰テストのみ
npm run test:regression

# 単体テストのみ
npm run test:unit

# 統合テストのみ
npm run test:integration

# E2Eテストのみ
npm run test:e2e
```

### 特定のテストファイルの実行
```bash
# 回帰テストスイート
node ./tests/regression/export-regression-suite.js

# 単体テスト
node ./tests/unit/export-service.test.js
node ./tests/unit/webview-manager.test.js

# 統合テスト
node ./tests/integration/command-manager.test.js

# E2Eテスト
node ./tests/e2e/export-from-preview-e2e.test.js
```

## テストの前提条件

1. **VS Code環境**: テストはVS Code拡張の環境で実行される必要があります
2. **ファイルシステム**: テスト用の一時ファイルが作成されます
3. **WebView**: プレビュー機能のテストにはWebViewの初期化が必要です

## テストヘルパー

`export-regression-suite.js`には`ExportTestHelper`クラスが含まれており、以下の機能を提供します：

- テストファイルの作成と管理
- プレビューの開閉
- エクスポートの実行
- WebViewの操作
- クリーンアップ処理

## テストケースの追加

新しいテストケースを追加する際は、以下の点に注意してください：

1. **テストファイルの命名**: 機能名とテストタイプを含める
2. **クリーンアップ**: テストで作成したファイルは必ず削除する
3. **エラーハンドリング**: 適切なエラー処理を含める
4. **ドキュメント**: テストの目的と内容をコメントで説明する

## トラブルシューティング

### テストが失敗する場合

1. **VS Code環境の確認**: 拡張が正しく読み込まれているか確認
2. **ファイルパーミッション**: テストファイルの作成・削除権限を確認
3. **WebViewの初期化**: プレビュー機能の初期化時間を調整
4. **エラーログ**: コンソールに出力されるエラーメッセージを確認

### パフォーマンスの問題

1. **待機時間の調整**: WebViewの初期化時間を環境に応じて調整
2. **テストファイルのサイズ**: 大量コンポーネントテストのサイズを調整
3. **並列実行**: テストの並列実行を避け、順次実行する

## 継続的インテグレーション

これらのテストは、以下の目的で継続的インテグレーションに組み込むことができます：

- コード変更時の回帰テスト
- 新機能追加時の動作確認
- パフォーマンスの監視
- 品質保証

## 関連ドキュメント

- [VS Code Extension Testing](https://code.visualstudio.com/api/working-with-extensions/testing-extension)
- [Mocha Testing Framework](https://mochajs.org/)
- [Node.js Assert Module](https://nodejs.org/api/assert.html) 