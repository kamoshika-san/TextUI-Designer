# VS Code拡張境界ガイド

このガイドは、`TextUI Designer` の「VS Code拡張としての責務」を最短で把握するための入口です。  
実装詳細に踏み込む前に、どこまでが拡張ホスト側の責務かを確認します。

## この境界の責務

- `activate` / `deactivate` を起点としたライフサイクル管理
- コマンド登録、診断更新、補完提供のオーケストレーション（補完の候補データは descriptor カタログが正本。JSON Schema は診断等で別系統。詳細は `MAINTAINER_GUIDE.md` の「補完（IntelliSense）と JSON Schema」節）
- WebView・Schema・Exporter など各サービスの初期化と破棄
- ユーザー設定（`contributes.configuration`）と実行時挙動の接続

## 最初に見るファイル

1. `src/extension.ts`
   - 拡張のエントリポイント
2. `src/services/service-initializer.ts`
   - サービス束の初期化・終了処理
3. `src/services/service-runtime-phases.ts`
   - 起動時ランタイム処理の段階化
4. `docs/MAINTAINER_GUIDE.md`
   - 保守運用全体の規約

## 関連ドキュメント

- コマンド仕様: `docs/contributes-commands.md`
- 設定体系: `docs/SETTINGS.md`
- サービス登録規約: `docs/service-registration.md`
- 互換ポリシー: `docs/api-compat-policy.md`

## 変更時のチェックポイント

- 拡張ホスト責務と WebView/CLI/MCP 責務が混ざっていないか
- サービスの追加・差し替え時に `ServiceFactoryOverrides` 契約を維持できているか
- コマンド/設定の追加時にドキュメント更新（`contributes-commands.md` / `SETTINGS.md`）が揃っているか
