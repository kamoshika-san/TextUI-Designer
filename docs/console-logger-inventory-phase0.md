# console と Logger の棚卸し（Phase 0）

外部アーキレビュー **Phase 0** の整理メモ。**実装の置換は行わない**（本格統一は別チケット）。判断のための分類である。

## 前提

- **Logger** の実装: `src/utils/logger.ts`。環境変数 `TEXTUI_LOG_LEVEL` でしきい値を変更できる。
- 本稿で対象とした 4 モジュールは、**現時点では `Logger` を import しておらず `console.*` のみ**を使用している。

## 対象ファイルと使用状況

### `src/services/event-manager.ts`

| 種別 | 行付近 | 内容 | 分類 |
|------|--------|------|------|
| `console.log` | 23, 43, 65, 90, 108, 118, 123, 142, 165, 172, 186 | `[EventManager]` プレフィックス付きの初期化・監視登録・クリーンアップのトレース | **移行候補** → `Logger` の `debug`/`info`（運用でノイズが多ければ `debug` に寄せる） |
| `console.error` | 84, 179 | スキーマ再初期化失敗、disposable 破棄エラー | **移行候補（優先）** → `Logger.error`（フィルタとプレフィックス統一） |

### `src/services/diagnostic-manager.ts`

| 種別 | 行付近 | 内容 | 分類 |
|------|--------|------|------|
| `console.log` | 77 | キャッシュヒット時「キャッシュされた診断結果を使用」 | **移行候補** → `Logger.debug` または **削除**（高頻度になりうるため） |

### `src/services/webview/yaml-parser.ts`

| 種別 | 行付近 | 内容 | 分類 |
|------|--------|------|------|
| `console.error` | 99 | YAML パースエラー | **移行候補（優先）** → `Logger.error`（ユーザー影響のある失敗経路） |
| `console.warn` | 122 | スキーマバリデーションエラー（詳細） | **移行候補** → `Logger.warn` |
| `console.error` | 130, 133 | スキーマバリデーション内部エラー（dev / 本番で分岐） | **移行候補（優先）** → `Logger.error` |

### `src/services/webview/webview-update-manager.ts`

| 種別 | 行付近 | 内容 | 分類 |
|------|--------|------|------|
| `console.log` | 45, 63–65, 74, 78, 84, 112, 118 | プレビュー更新フロー・パラメータのトレース | **移行候補** → `Logger.debug`（`TEXTUI_LOG_LEVEL` で抑制しやすくする） |
| `console.error` | 162 | YAML 送信処理の例外 | **移行候補（優先）** → `Logger.error` |
| `console.warn` | 208 | キャッシュ用 YAML 読み込み失敗 | **移行候補** → `Logger.warn` |
| `console.log` | 253 | `_testMemoryManagement()` 内（テスト用 API） | **当面は残す**（テスト専用）／移行時は `Logger.debug` も可 |

## 何を「残す」とみなすか（判断の根拠）

- **テスト専用の公開メソッド（`_testMemoryManagement` 等）**に付随するログは、本番のログ方針と切り離して **テスト実行時のみ**意味を持つため、**置換チケットで扱うか、テストヘルパーに閉じる**のがよい。
- **高頻度になりうる `console.log`**（診断キャッシュヒット、プレビュー経路の詳細）は `Logger.debug` に寄せるか、**削除**して **`TEXTUI_LOG_LEVEL` での制御**に一本化するのが妥当。
- **`console.error` / `console.warn`** はユーザー向けの失敗・警告と開発者向けのトレースが混ざりやすいため、**優先的に `Logger` に寄せ**、レベルとプレフィックスを揃えると、将来の「本格ログ統一」に繋げやすい。

## やらないこと（本チケットの外）

- 上記コードの **実際の置換・リファクタ**（別チケットで実施）
