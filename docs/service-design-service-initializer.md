# 設計メモ: ServiceInitializer

## 目的 / 背景

- 拡張の **サービス束（`ExtensionServices`）** を `ServiceFactory` で生成し、**ランタイム初期化**と **クリーンアップ**を宣言的なフェーズ配列で実行する。
- `activate` / `deactivate` の前後の境界は **`ExtensionLifecycleManager`** と `extension-lifecycle-phases.ts` が担当する。本メモは **サービス束の生成〜`initializeRuntime`〜`cleanup`** に限定する。

## 外部契約（いつ何をするか）

| 契約 | 内容 |
|------|------|
| **`initialize()`** | `createServices()`（`ServiceFactory`）→ `initializeRuntime(services)`（`RUNTIME_INIT_PHASES` を順実行）。失敗時は `cleanup()` を試みてから throw。 |
| **`cleanup()`** | `DISPOSE_PHASES` を順に `run`。完了後 `services = null`。個別フェーズのエラーはログに留まる設計（全体の `try/catch`）。 |
| **`getServices()`** | 初期化前・クリーンアップ後は `null`。 |
| **`ServiceFactoryOverrides`** | テストやカスタム構成でファクトリの各 `create*` を差し替え可能。 |

### ランタイム初期化フェーズ（`RUNTIME_INIT_PHASES`）

順序が **契約**である。例: `schema`（`schemaManager.initialize`）→ `commands`（コマンド登録）→ `mcp`（`ensureMcpConfigured`）→ `theme`（テーマ読込・WebView へ CSS 変数・ファイル監視）。

### 解放フェーズ（`DISPOSE_PHASES`）

順序が **契約**である。例: `schema`（スキーマ登録解除）→ `diagnostic` → `commands` → `webview` → `theme`。

## 重要な制約（不変条件）

- **`services` は `cleanup` 後に必ず `null`**。再初期化は新しい `initialize()` 呼び出し。
- **フェーズ配列の順序を変えると**、依存関係（スキーマ未登録でコマンド、テーマ未ロードで WebView 等）が壊れる。変更時は `service-runtime-phases.ts` と `service-initializer.test.js` をセットで確認する。
- **MCP 設定**は `RuntimeInitContext.ensureMcpConfigured` 経由。失敗しても拡張全体の activate は継続しうる（ログのみ）。

## よくある誤解（保守で踏みやすい罠）

- **「`ServiceInitializer` が Extension の activate」** — 拡張エントリの位相は `ExtensionLifecycleManager`。ここはサービス束に特化。
- **新サービスを追加したら** `ExtensionServices`・`ServiceFactory`・**両方のフェーズ配列**のどこに載せるかを決める。片方だけだとリークや未初期化になる。
- `initialize()` 内の例外で **`cleanup()` が呼ばれる** — 二重初期化や中途半端な購読が残らないよう、追加サービスは `DISPOSE_PHASES` に対応する解放を必ず用意する。

## 関連リンク

- コード: `src/services/service-initializer.ts`、`src/services/service-runtime-phases.ts`、`src/services/service-factory.ts`、`src/services/extension-services.ts`
- ドキュメント: [service-registration.md](service-registration.md)、[MAINTAINER_GUIDE.md](MAINTAINER_GUIDE.md)（サービス初期化・拡張ライフサイクルの行）
- チケット: [[2026-03-20_サービス設計メモ整備]]（`T-20260320-024`）
