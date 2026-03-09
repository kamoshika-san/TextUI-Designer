# リファクタリング評価レポート（2026-03-09）

## 評価サマリ

現状は**機能追加が継続できる設計**を維持できていますが、以下の3点で将来的な保守コスト増の兆候があります。

1. **単一ファイルへの責務集中**（特に MCP サーバー / WebView）
2. **類似ロジックの重複**（スキーマ読込やメッセージ分岐）
3. **インライン文字列・テンプレート肥大化**（HTML エクスポート）

優先度としては、まず「安全に分割できる箇所」から進めるのが有効です。

---

## 観測したホットスポット

- `src/mcp/server.ts` は 700 行超で、ツール定義・JSON-RPC ルーティング・CLI 実行・プロンプト生成を1箇所で担っています。
- `src/exporters/html-exporter.ts` は 700 行超で、HTMLテンプレート生成とテーマ変換ロジックが同居しています。
- `src/renderer/webview.tsx` は 600 行超で、メッセージイベント処理・UIレンダリング・エラー表示が密結合です。
- `src/services/schema-manager.ts` には `loadSchema` / `loadTemplateSchema` / `loadThemeSchema` の重複したキャッシュ読込パターンがあります。

---

## 推奨リファクタリング項目（優先順位付き）

### P1. MCP サーバーの機能分割（最優先）

**対象**: `src/mcp/server.ts`

**課題**
- `TOOLS` 定義と `handleToolCall` の `if/else` チェーンが大きく、ツール追加時の差分が広くなりがち。
- `capturePreview` / `runCli` の CLI 実行責務が同ファイルにあり、MCP プロトコル層と実行層が混在。

**提案**
- `mcp/tools/*` にツールごとのハンドラを分割（`ToolHandler` インターフェース化）。
- CLI 実行を `mcp/cli-runner.ts` に抽出。
- `TOOLS` メタデータも `mcp/tool-manifest.ts` に分離。

**期待効果**
- 変更時の影響範囲を局所化。
- 単体テストをハンドラ単位に分割しやすくなる。

### P1. SchemaManager の重複排除

**対象**: `src/services/schema-manager.ts`

**課題**
- 3種類の `load*Schema` で同型ロジック（TTL チェック → readFileSync → JSON.parse → cache 更新）を繰り返し実装。

**提案**
- `loadSchemaWithCache(kind)` の共通関数を新設し、差分（path/cache/debug文言）を引数化。
- 例外メッセージの生成も map 化して一元管理。

**期待効果**
- バグ修正時の修正漏れ防止。
- 可読性・テスト容易性の向上。

### P2. WebView メッセージ処理のディスパッチ化

**対象**: `src/renderer/webview.tsx`

**課題**
- `useEffect` 内の message.type 分岐が長く、データ変換と副作用（DOM更新・state更新）が混在。

**提案**
- `messageHandlers: Record<string, (msg) => void>` へ置換。
- `theme-variables` の style 反映は専用関数へ抽出。
- エラー状態生成ロジックを `error-mappers.ts` に分離。

**期待効果**
- メッセージ追加時の競合を低減。
- レンダリング責務と I/O 責務の分離。

### P2. HTML Exporter のテンプレート分離

**対象**: `src/exporters/html-exporter.ts`

**課題**
- 大きなテンプレート文字列とテーマ変換処理が同居し、差分レビューがしづらい。

**提案**
- HTML 外枠を `template-builder.ts` 化。
- CSS 変数生成を `theme-style-builder.ts` 化。
- `export()` は「データ準備 → 部品生成 → テンプレート組み立て」の 3 ステップに限定。

**期待効果**
- 見た目調整とロジック修正を分離しやすくなる。
- テンプレート断片を単体テストしやすい。

### P3. DiagnosticManager のアルゴリズム分離

**対象**: `src/services/diagnostic-manager.ts`

**課題**
- 診断生成・位置解決・類似キー提案（レーベンシュタイン距離）など複数アルゴリズムが同クラスに集中。

**提案**
- `diagnostics/range-resolver.ts`
- `diagnostics/template-builder.ts`
- `diagnostics/key-suggestion.ts`
  の3モジュールへ抽出。

**期待効果**
- 高頻度変更箇所を独立して改善可能。
- 大規模テストケースの切り出しが容易。

---

## 推奨の実行順（低リスク順）

1. `SchemaManager` の重複排除（小変更・高効果）
2. `MCP` の CLI 実行分離
3. `WebView` メッセージディスパッチ化
4. `HTML Exporter` テンプレート分割
5. `DiagnosticManager` のアルゴリズム分離

---

## 補足（進捗更新）

初版作成後に、以下は対応済みです。

- `SchemaManager` の `loadSchemaWithCache(kind)` 集約
- MCP の `CliRunner` 分離と `tool-manifest.ts` 分離
- WebView の `messageHandlers` 化と `error-mappers.ts` 分離
- HTML Exporter の `html-template-builder.ts` / `theme-style-builder.ts` 分離
- DiagnosticManager の `key-suggestion.ts` / `template-builder.ts` 分離

上記の優先課題は一通り実装済みで、今後は各モジュールの単体テスト拡充と、より細かいハンドラ単位への分割を継続候補とします。
