# キャッシュ共通ポリシー（Export / WebView Preview）

レンダリング結果用の **`CacheManager`**（`src/utils/cache-manager.ts`）と、WebView プレビュー用の **`WebViewPreviewCacheManager`**（`src/services/webview/cache-manager.ts`）は**別クラス**だが、運用・障害調査で迷子にならないよう **共通原則**をここに固定する。実装の完全統合はスコープ外（将来検討）。

横断の境界宣言は [observability-and-cache-boundary.md](observability-and-cache-boundary.md) を参照。

## 1. 二系統の役割

| 系統 | 主用途 | キーの材料 |
|------|--------|------------|
| Export `CacheManager` | DSL レンダリング結果の再利用 | DSL の JSON 化＋ハッシュ、出力フォーマット |
| WebView `WebViewPreviewCacheManager` | プレビュー経路の YAML 解析結果の再利用 | ファイル名＋コンテンツの簡易ハッシュ |

呼び出し側は **どちらのキャッシュがどのサービスに束縛されているか**だけを知ればよい（内部キーや eviction の詳細に依存しない）。

## 2. キー生成

- **安定性**: 同一論理入力に対し同一キーになること。入力変更時は別キーになること。
- **Export**: `generateKey` は DSL とフォーマットから導く（実装の正は `CacheManager`）。
- **WebView Preview**: `fileName` と `content` を連結した上で簡易ハッシュを付与（`generateCacheKey`）。衝突耐性は「開発用プレビュー」レベルでよいが、**意図的に衝突を起こさない**こと。

## 3. エビクション（追い出し）

- **Export**: `maxSize` 到達時に **最古タイムスタンプ**のエントリを 1 件削除（`evictOldest`）。TTL 超過は `get` / `cleanup` で削除。
- **WebView Preview**:
  - 合計サイズが **50MB** を超えそうなら、タイムスタンプ昇順で古いエントリを削除（`evictOldEntries`）。
  - エントリ数が **100** に達したら **最古 1 件**を削除（`evictOldestEntry`）。
- **混同禁止**: WebView 側に TTL ベースの期限切れ削除は無い（メモリ・件数ベース）。Export 側の TTL 仕様と**同じものではない**。

## 4. ロギング（Logger）

- アプリ共通の **`Logger`**（`src/utils/logger.ts`）を使う。生の `console.log('[手書きプレフィックス] …')` は、**当該クラスの主要パスでは使わない**。
- 出力形式は **`[TextUI][<scope>] <message>`**（`Logger` 実装に準拠）。
- レベルは **`TEXTUI_LOG_LEVEL`**（`debug` / `info` / `warn` / `error`）で閾値制御。開発時は `NODE_ENV=development` で既定 `debug`。
- WebView プレビューキャッシュのスコープ名は **`WebViewPreviewCache`**（`WebViewPreviewCacheManager` 内）。

## 5. メモリプレッシャー時の振る舞い（WebView Preview）

`checkMemoryUsage` は `process.memoryUsage().heapUsed` を **MB** で見る。

| ヒープ使用量（目安） | 動作 |
|---------------------|------|
| &gt; 150 MB | キャッシュ全消去（`clearCache`） |
| &gt; 100 MB | 古いエントリを約 30% 相当の容量分まで削除 |
| &gt; 50 MB | ログのみ（保持継続） |
| それ以下 | ログのみ（保持継続） |

閾値は **ヒューリスティック**であり、将来チューニングされうる。変更時は本節を更新する。

## 6. 統計（stats）について

hitRate・reset・デバッグ表示・テスト観点の **共通契約と既存実装とのギャップ**は、RF3-S1-T3 で本ドキュメントに **「統計（stats）の共通契約とギャップ」** として追記する。
