# プレビュー更新パイプライン（フェーズ遷移）

`WebViewUpdateManager.sendYamlToWebview` 内で、`PreviewUpdateCoordinator` が **1 回の送信処理**のフェーズを表す。

## キュー・デバウンスとの関係

- **UpdateQueueManager**: デバウンス・優先度キュー・最小更新間隔。タスクの `execute` が `sendYamlToWebview` を呼ぶ。
- **PreviewUpdateCoordinator**: その **1 回の呼び出し**の内部（ソース解決 → キャッシュ → パース → 配信）を追跡する。キュー上の「待ち」はここには含めない（将来、タスク開始時に `scheduled` を二重に扱わないよう整理可能）。

## フェーズ一覧（`PreviewUpdatePhase`）

| 値 | 意味 |
|----|------|
| `idle` | パイプライン外 |
| `scheduled` | `isUpdating` ロック取得直後、処理本体の開始 |
| `resolving_source` | キャッシュキー用に現在の YAML テキストを解決 |
| `cache_lookup` | メモリキャッシュのヒット判定 |
| `parsing` | `YamlParser.parseYamlFile`（YAML パース・include・**スキーマ検証を内包**） |
| `validating` | パース完了後、キャッシュ保存と配信の直前（スキーマ検証自体は `parsing` 内で完了） |
| `delivering` | `postMessage` による WebView への配信 |
| `failed` | 例外捕捉（直後に `idle` に戻る） |

## 遷移図（概略）

```mermaid
stateDiagram-v2
  [*] --> idle
  idle --> scheduled: beginPipeline()
  scheduled --> resolving_source
  resolving_source --> cache_lookup
  cache_lookup --> delivering: キャッシュヒット
  cache_lookup --> parsing: ミス
  parsing --> validating
  validating --> delivering
  delivering --> idle: endPipeline()
  parsing --> failed: 例外
  validating --> failed: 例外
  delivering --> failed: 例外
  failed --> idle: endPipeline()
```

## 実装上の注意

- **スキーマ検証**は `YamlParser` 内部で実行されるため、`parsing` と `validating` の境界は「非同期 1 呼び出し」の前後で表現している。検証だけを別フェーズに細分化する場合は `YamlParser` 側の分割が必要になる。

## 観測と制御の境界（T-208）

- **`PreviewUpdateCoordinator` / `PreviewUpdatePhase` は観測（テレメトリ・デバッグ）用**。1 回の送信処理の内部でどこまで進んだかを表す。
- **制御**（再入防止・スキップ・キュー優先度・デバウンス）は **`UpdateQueueManager`**、**`PreviewUpdateSessionState`**（`isUpdating` 等）、**`shouldBlockYamlSend`** などが担う。
- フェーズを読んで「このタイミングでは送らない」等の **新たな業務分岐を足さない**こと。境界の説明の正本は `preview-update-coordinator.ts` のクラス JSDoc。

## 関連コード

- `src/services/webview/preview-update-coordinator.ts`（フェーズ状態は **観測専用**。`WebViewUpdateManager` から外部公開しない — T-207）
- `src/services/webview/webview-update-manager.ts`（オーケストレーション。フェーズは内部の `PreviewUpdateCoordinator` のみ）
- [webview-update-manager-responsibilities.md](./webview-update-manager-responsibilities.md)（責務一覧・後続スライス候補）
