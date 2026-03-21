# サービス設計メモ: WebViewManager（プレビュー）

## 目的 / 背景

- VS Code **WebView** で DSL のプレビューを表示し、テーマ変数や YAML 更新を反映する。
- 責務が肥大化しないよう **ファサード + 専用クラス**に分割している。

## 構成上の要点

- **ファサード**: `src/services/webview-manager.ts` の `WebViewManager`。
- **ライフサイクル**（パネル生成・破棄・`retainContextWhenHidden` 等）: `WebViewLifecycleManager`（`webview-lifecycle-manager.ts`）。
- **更新**（YAML 送信・キャッシュ・デバウンス）: `WebViewUpdateManager`（`webview-update-manager.ts`）。
- **メッセージ**（WebView ↔ 拡張ホスト）: `WebViewMessageHandler`（`webview-message-handler.ts`）。

## 外部契約（呼び出し側が期待できること）

- **`openPreview()`**: 既にパネルがあれば `reveal`、なければ `createPreviewPanel` の後に **メッセージハンドラをセットアップ**（初回のみ）。
- **`updatePreview(force)`**: `WebViewUpdateManager` 経由。キャッシュ・デバウンス・ファイルパス追従のポリシーは update 側に集約。
- **`applyThemeVariables` / `notifyThemeChange`**: メッセージ経由で WebView 内の表示に反映（`ServiceInitializer` の `theme` フェーズと連携）。
- **`dispose()`**: update → lifecycle の順で解放（`webview-manager.ts` 内の呼び出し順）。

## 不変条件

- **単一パネル**の参照は `WebViewLifecycleManager` が保持（`currentPanel`）。二重生成を避けるため `openPreview` は `hasPanel` を見る。
- WebView の HTML 初期ロードは `getWebviewContent`（`webview-utils`）。**メディアパス・CSP**の都合で変更時はプレビュー全体に影響する。

## よくある誤解・罠

- **「WebViewManager = レンダリング本体」ではない** — React 側の描画は `src/renderer/`。ここは **ホスト側のパネルとメッセージのオーケストレーション**。
- `openPreview` 後にメッセージが届かない場合、**`setupMessageHandler` が一度だけ**であること、`dispose` 済みでないかを疑う。

## 関連リンク

- 実装: `src/services/webview-manager.ts`、`src/services/webview/`
- プレビュー更新パイプライン概要: `docs/preview-update-pipeline.md`
- チケット: `T-20260320-024`（サービス設計メモ整備）
