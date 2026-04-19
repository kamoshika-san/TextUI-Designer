# console と Logger の棚卸し（Phase 0）

外部アーキレビュー **Phase 0** の整理メモ。当初は判断用の分類のみだったが、**プレビュー経路（`WebViewUpdateManager` / `WebViewPreviewCacheManager` / `WebViewMessageHandler`）は T-20260321-065 で `Logger` に寄せ済み**。下表の行番号・記述はスナップショットのため未更新の箇所あり。残りは別チケットで本格統一。

## 前提

- **Logger** の実装: `src/utils/logger.ts`。環境変数 `TEXTUI_LOG_LEVEL` でしきい値を変更できる。
- 下表のうち **event-manager / diagnostic-manager / yaml-parser** は未移行のまま棚卸し用に残す。**プレビュー経路 3 ファイル**は T-065 で移行済み。

## 対象ファイルと使用状況

### `src/services/event-manager.ts`

| 種別 | 行付近 | 内容 | 分類 |
|------|--------|------|------|
| `console.log` | — | `EventManager` の初期化・監視登録・クリーンアップのトレース | **移行済み（RF4-T1）** → `Logger.debug` |
| `console.error` | — | スキーマ再初期化失敗、disposable 破棄エラー | **移行済み（RF4-T1）** → `Logger.error` |

### `src/services/diagnostic-manager.ts`

| 種別 | 行付近 | 内容 | 分類 |
|------|--------|------|------|
| `console.log` | — | キャッシュヒット時「キャッシュされた診断結果を使用」 | **移行済み（RF4-T1）** → `Logger.debug` |
| `console.log` | — | キャッシュサイズ制限到達時の古いキャッシュ削除 | **移行済み（RF4-T1）** → `Logger.warn` |

### `src/services/webview/yaml-parser.ts`

| 種別 | 行付近 | 内容 | 分類 |
|------|--------|------|------|
| `console.error` | 99 | YAML パースエラー | **移行候補（優先）** → `Logger.error`（ユーザー影響のある失敗経路） |
| `console.warn` | 122 | スキーマバリデーションエラー（詳細） | **移行候補** → `Logger.warn` |
| `console.error` | 130, 133 | スキーマバリデーション内部エラー（dev / 本番で分岐） | **移行候補（優先）** → `Logger.error` |

### `src/services/webview/webview-update-manager.ts`（**T-065: `Logger` 化済み**）

| 種別 | 行付近 | 内容 | 分類 |
|------|--------|------|------|
| （移行済） | — | 旧 `console.*` は `Logger`（主に `debug` / `warn` / `error`）へ置換 | **完了**（T-20260321-065） |

### `src/services/webview/cache-manager.ts`（WebViewPreviewCacheManager）（**T-065: `Logger` 化済み**）

| 種別 | 行付近 | 内容 | 分類 |
|------|--------|------|------|
| （移行済） | — | 旧 `console.*` は `Logger` へ置換 | **完了**（T-20260321-065） |

### `src/services/webview/webview-message-handler.ts`（**T-065: `Logger` 化済み**）

| 種別 | 行付近 | 内容 | 分類 |
|------|--------|------|------|
| （移行済） | — | 旧 `console.*` は `Logger` へ置換 | **完了**（T-20260321-065） |

## 何を「残す」とみなすか（判断の根拠）

- **テスト専用の公開メソッド（`_testMemoryManagement` 等）**に付随するログは、本番のログ方針と切り離して **テスト実行時のみ**意味を持つため、**置換チケットで扱うか、テストヘルパーに閉じる**のがよい。
- **高頻度になりうる `console.log`**（診断キャッシュヒット、プレビュー経路の詳細）は `Logger.debug` に寄せるか、**削除**して **`TEXTUI_LOG_LEVEL` での制御**に一本化するのが妥当。
- **`console.error` / `console.warn`** はユーザー向けの失敗・警告と開発者向けのトレースが混ざりやすいため、**優先的に `Logger` に寄せ**、レベルとプレフィックスを揃えると、将来の「本格ログ統一」に繋げやすい。

## やらないこと（本ドキュメントの外）

- **event-manager / diagnostic-manager / yaml-parser** など、上記以外の `console.*` の置換は **別チケット**で実施
