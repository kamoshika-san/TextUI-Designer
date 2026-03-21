# プレビュー更新パイプライン（5 ポート）

`WebViewUpdateManager`（`src/services/webview/webview-update-manager.ts`）は **オーケストレーション**に限定し、次のモジュールへ責務を分割する（T-077 / T-093 / T-106）。

| ポート | モジュール | 役割 |
|--------|------------|------|
| **SourceResolver** | `preview-yaml-source-resolver.ts` | アクティブ編集または `lastTuiFile` からキャッシュキー用の YAML 本文を解決 |
| **PreviewParserValidator** | `preview-parser-validator-port.ts` | `YamlParser` 経由でパース・include・スキーマ検証まで |
| **PreviewCache** | `preview-cache-port.ts` + `cache-manager.ts` | ヒット lookup（ポート）とエントリ保存・メモリ管理（マネージャ） |
| **PreviewDelivery** | `preview-webview-deliver.ts` | `postMessage` による WebView への DSL 配信 |
| **PreviewFailurePolicy** | `preview-failure-policy.ts` | パース / スキーマ / サイズ / その他の例外を UI・WebView へ伝播 |

隠れ状態は `preview-update-session-state.ts` の `PreviewUpdateSessionState` に束ねる。
