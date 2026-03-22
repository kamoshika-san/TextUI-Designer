# WebViewUpdateManager — 責務リスト（T-20260321-070）

`WebViewUpdateManager`（`src/services/webview/webview-update-manager.ts`）に集約されやすい関心を列挙する。最適化・観測は将来 **feature policy** へ閉じる想定。

## 責務一覧

| # | 責務 | 主な所在 | 備考 |
|---|------|----------|------|
| 1 | **ソース解決**（キャッシュキー用の現在 YAML テキスト） | `PreviewYamlSourceResolver`（`preview-yaml-source-resolver.ts`） | **第1スライスで抽出済み** |
| 2 | **更新キュー・デバウンス・優先度** | `UpdateQueueManager` | 既存委譲 |
| 3 | **パイプラインフェーズ観測** | `PreviewUpdateCoordinator` | 既存委譲 |
| 4 | **キャッシュ（ヒット判定・保存・メモリ）** | `WebViewPreviewCacheManager` | 既存委譲 |
| 5 | **YAML パース・検証** | `YamlParser` | 既存委譲 |
| 6 | **WebView への配信**（画像パス正規化含む） | `sendMessageToWebView` | `resolveImageSourcesInDsl` + `postMessage` |
| 7 | **エラー種別に応じた通知** | `WebViewErrorHandler` / `ErrorHandler` | |
| 8 | **自動プレビュー設定の解釈** | `updatePreview` / `sendYamlToWebview` 冒頭 | `ConfigManager` |
| 9 | **lastTuiFile 変更時のキャッシュ・エラー状態クリア** | `setLastTuiFile` | |
| 10 | **再入防止（isUpdating）** | `sendYamlToWebview` | キューと併用 |
| 11 | **テスト用フック** | `createYamlCacheTestAdapter()`（`WebViewYamlCacheTestAdapter`） | T-207 で YAML/パース/メモリ検査を単一入口に集約。`_testMemoryManagement`・`lastParsedData` 相当は廃止 |

## 第1スライス

- **抽出**: 上表 #1 を `PreviewYamlSourceResolver` に移し、`WebViewUpdateManager` は委譲のみ。

## 後続スライス候補（切り出し候補）

1. **配信**（#6）を `PreviewPayloadDeliverer` などに分離（webview URI 解決を閉じ込める）。
2. **自動プレビュー判定**（#8）を単一の `PreviewEligibilityPolicy` にまとめる。
3. **lastTuiFile + キャッシュ無効化**（#9）を `ActiveDocumentSync` 系にまとめる。
4. **isUpdating + coordinator** の「1 トランザクション」境界をさらに明示するファサード。

## 関連ドキュメント

- [preview-update-pipeline.md](./preview-update-pipeline.md)（フェーズ遷移）
- [service-design-webview-manager.md](./service-design-webview-manager.md)（全体構成）
