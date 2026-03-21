# サービス設計メモ: FileWatcher

## 目的 / 背景

- DSL / テーマ / テンプレートの編集に応じてプレビューや診断を更新するため、**ドキュメントの保存・変更・アクティブエディタ**を監視する。
- 保存直後や高速入力時に処理が爆発しないよう、**デバウンス・スロットル・経路スキップ**を明示的に分離している。

## 構成上の要点

- **エントリ**: `src/services/file-watcher.ts` は `file-watcher-impl` の再エクスポート。
- **本体**: `src/services/file-watcher/file-watcher-impl.ts` の `FileWatcher`。
- **購読**: `ActiveEditorSubscription` / `DocumentSaveSubscription` / `DocumentChangeSubscription`（`file-watcher-subscriptions.ts`）がそれぞれ VS Code イベントを購読。
- **タイミング定数・純粋な分岐**: `file-watcher-timing.ts`（`FileWatcherSyncState` と `shouldSkip*` / `shouldThrottle*` 等）。

## 外部契約（いつ何が走るか）

- `startWatching(services)` が呼ばれた後にのみ購読が有効。`ExtensionServices` 束への参照が必要。
- 対象ファイルは **`ConfigManager.isSupportedFile`** で判定（設定された拡張子に限定）。
- 変更経路では **保存直後一定時間**はドキュメント変更処理をスキップする（ディスク反映・フォーマッタとの競合緩和）。
- **保存中フラグ**が立っている間は変更経路をスキップ（`isSaving`）。
- **変更回数・最小間隔・ドキュメントサイズ**でスロットル / スキップ（`MAX_CHANGES_PER_SECOND` 等）。

## 不変条件（守るべきもの）

- タイマーは各 `*Subscription` が保持。`stopWatching` では **タイマー解除 → disposable 一括 dispose** の順でリークを防ぐ。
- `FileWatcherSyncState` は購読間で共有。**保存と変更の順序依存**をここで表現する。

## よくある誤解・罠

- **「変更イベントが来たから必ずプレビュー更新」ではない** — 上記スキップ/スロットルで意図的に落ちる。
- 定数をいじると **診断やプレビューの追従遅延・取りこぼし**のトレードオフが変わる。変更時は `file-watcher-timing` のコメントとユニットテストを確認すること。

## 関連リンク

- 実装: `src/services/file-watcher/`
- チケット: `T-20260320-024`（サービス設計メモ整備）
- 設定拡張子: `ConfigManager` / `docs/SETTINGS.md`
