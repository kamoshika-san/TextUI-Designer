# TextUI Designer テストスイート

このディレクトリには、TextUI Designer拡張の包括的なテストスイートが含まれています。

## テストの種類

**層の定義（unit / integration / smoke）と CI との対応**は [`docs/test-matrix.md`](../docs/test-matrix.md) を参照。

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
- `command-manager.test.js` — CommandManager の統合テスト
- `theme-switching.test.js` — WebView メッセージ経由のテーマ検出・切り替え（**Integration 層**。`test:e2e`（simulated）とは別ライン）

**テスト内容:**
- コマンドの登録と実行（command-manager）
- エクスポートコマンドの処理
- 複数コマンドの連続実行
- パフォーマンステスト
- テーマ一覧送信・`theme-switch` 後の CSS / アクティブ状態（theme-switching）

### Integration と simulated E2E の判断基準（1ページ）

**どちらも Node + Mocha + `tests/setup.js` のモック `vscode` 上で動く**点は同じです。**実 VS Code Extension Host を起動するテストではありません**（実機検証は [`docs/real-vscode-smoke.md`](../docs/real-vscode-smoke.md) および別ラインを参照）。

| 観点 | `tests/integration/`（統合） | `tests/e2e/`（simulated E2E・`npm run test:e2e`） |
|------|------------------------------|--------------------------------------------------|
| **主な目的** | 複数サービス／モジュールが **既存の束ね方**（例: `CommandManager`、WebView メッセージ経路）でつながることの検証 | **ユーザー操作に近いシナリオ**を、モック環境で **厚め・長め**に通す（プレビュー起点のエクスポートなど） |
| **置き場所の目安** | 2〜3 コンポーネントの連携、コマンド登録、メッセージ契約の **境界** | **エンドツーエンドに近い一本道**（失敗時にどこが悪いかはログとシナリオ名で追う） |
| **重複が疑わしいとき** | 同じ振る舞いを **integration で十分**か（単一サービス＋モックで十分なら `unit/`） | **「結合の厚み」**が価値か。薄いラッパーだけなら integration に寄せ、**大規模な移動は別チケット** |

**選び方（簡易）**

1. **単一クラス・単一関数**の振る舞い → `unit/`（ファクトリ注入・ローカル補完）。
2. **サービス同士の配線**や **WebView メッセージとハンドラの契約** → `integration/`。
3. **画面操作の流れをまるごと**モックで再現し、退行を捕まえたい → `e2e/`（simulated）。CI 上の名前は historical に `test:e2e` のまま。

詳細なレイヤ定義と CI 対応は [`docs/test-matrix.md`](../docs/test-matrix.md) を正とする。

### 新規テストの最短経路（setup.js 非拡大）

グローバルフック（`Module.prototype.require` や `tests/setup.js` への追加）を**増やさず**にテストするための推奨パスです。

- **推奨**: 対象クラスに **constructor / factory 注入**（例: `SchemaManager` の `SchemaManagerSeams`、`CommandManager` の `RuntimeInspectionCommandBindings`）を使い、**差し替え可能な依存**だけをテストでスタブする。
- **統合テストのサービス束**: `tests/helpers/integration-service-factory.js` の `createIntegrationServices`（`ServiceFactory` オーバーライドの雛形）。
- **WebView 系 unit テストのローカル補完**: `tests/unit/webview-utils.test.js` の `createTestWebviewPanel()` を基準に、`cspSource` や `asWebviewUri` のような **不足 API だけ**をテスト内 helper で補完する。`global.vscode` の手書き差し替えや、その場限りの `Module.prototype.require` 横取りで埋めない。
- **反パターン**: `global.vscode` を手書きで上書きし続ける、テスト専用に `setup.js` にグローバルフックを追加する（方針上の詳細は [`docs/test-setup-policy.md`](../docs/test-setup-policy.md)）。
- **レイヤと CI の対応**: [`docs/test-matrix.md`](../docs/test-matrix.md)。

### 4. Simulated E2E（`e2e/`・Node + Mocha）

**実 VS Code Extension Host 上の E2E ではありません。** `npm run test:e2e` は **`tests/setup.js` で `vscode` をモックした Node 上の Mocha** で、`e2e/` 配下のシナリオを走らせます。リポジトリ内では **「実機 E2E」ではなく simulated-e2e（シミュレートされた結合シナリオ）** と捉えてください。

**ファイル:**
- `export-from-preview-e2e.test.js` — プレビュー起点のエクスポートを、モック環境で厚めに扱うシナリオ

**テスト内容（保証のイメージ）:**
- モックされた `vscode` / WebView まわりを通した **結合に近い**挙動
- ユーザー操作に相当する呼び出しのシミュレーション
- （スクリプト名は historical に `test:e2e` のまま）

**実 VS Code 上での検証**が必要な場合は、`npm run test:vscode-smoke` を使います。これは `@vscode/test-electron` ベースの narrow smoke で、デフォルトの Mocha ラインを置き換えるものではありません。

**手動の最小スモーク**（活性化 → プレビュー → HTML エクスポート）は、拡張リポジトリの [`docs/real-vscode-smoke.md`](../docs/real-vscode-smoke.md) を正とする。

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
node ./tests/integration/theme-switching.test.js

# E2Eテスト
node ./tests/e2e/export-from-preview-e2e.test.js
```

## テストの前提条件

1. **Node.js環境**: テストは`tests/setup.js`で`vscode`モジュールをモック化して実行されるため、**VS Code 拡張ホストの起動は不要**です（`test:e2e` も同様に **simulated** です。上記「4. Simulated E2E」参照）。
2. **ファイルシステム**: テスト用の一時ファイルが作成されます
3. **WebView関連アセット**: `media/`が未生成でも主要テストは実行できます（不足時は警告ログが出る場合があります）

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

1. **環境の確認**: 多くのテストは **モック上の Node** で動くため、**実拡張のインストール状態**は問いません。`out/extension.js` が無い場合は `npm run compile` のあとに再実行してください（`tests/setup.js` が案内します）。
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

- [テストセットアップ方針（グローバルフック非拡大）](../docs/test-setup-policy.md)
- [VS Code Extension Testing](https://code.visualstudio.com/api/working-with-extensions/testing-extension)
- [Mocha Testing Framework](https://mochajs.org/)
- [Node.js Assert Module](https://nodejs.org/api/assert.html) 

## Primary / Fallback lane taxonomy

- `Primary`: `HtmlExporter` の既定経路。`useReactRender` を省略するか `true` を渡すケースで、通常の export / provider / preview 整合はこちらを正とする。
- `Fallback`: `useReactRender === false` を明示したケース。capture や legacy compatibility 確認のための補助レーンで、差分調査は primary を基準に扱う。
- fallback 専用テストは `describe` または `it` に `fallback` を含め、`withExplicitFallbackHtmlExport(...)` で internal compatibility lane を明示する。
- primary 前提テストは `useReactRender` を省略するか `true` を明示し、preview/export parity や provider 既定経路の確認として読める名前にする。
- regression / unit / integration / simulated e2e のどの階層でもこの lane 用語を優先し、`legacy` や曖昧な表現だけで済ませない。
