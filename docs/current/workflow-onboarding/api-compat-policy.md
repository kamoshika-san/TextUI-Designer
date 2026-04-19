# 運用安定契約（公開API / 設定キー / Exporter互換）方針

この文書は `TextUI-Designer` の「進化時に壊しにくい外部契約」を明文化するためのガイドです。破壊的変更の判断と、最小限の回帰ガードをチームで揃えることを目的にします。

## 1. 公開API（破壊的変更の対象）

次のいずれかが「外部が依存する形」として扱われるものは、基本的に公開APIとして扱います。

- VS Code 拡張の `contributes.commands`（command id と引数契約）
- CLI の `--provider` 名、サブコマンド（`export/validate/capture/plan/apply` 等）とオプション体系（少なくともエントリポイントと exit code 契約）
- WebView/拡張間のメッセージ型（`postMessage` の `type` と payload 形）
- MCP の `resources` / `tools` に関する DTO とレスポンス形

※ ここで言う「公開API」の境界は、実装の場所ではなく「利用者が期待する契約」を基準に置きます。

## 2. 設定キー互換（`contributes.configuration`）

設定キーは、基本的に次の生成・検証フローを正とします。

- `src/config/configuration-properties.ts` を起点に生成
- `sync:configuration` / `check:configuration` で `package.json` を同期・検証

互換方針（推奨）:

- 既存キーの「意味（単位・挙動）」を勝手に変更しない（見た目だけの値変換も原則禁止）
- キーを変更したい場合は、新キー追加 + 旧キーは非推奨（`deprecate`）として残し、段階的に移行する
- 非推奨期間（何バージョン残すか）は本ドキュメントで未確定（今後決めるための伏線）
- 互換破壊が避けられない場合は、チェックリスト（後述）に従い「移行手順・回帰テスト・リリースノート」を必須にする

## 3. Exporter provider / 出力互換

Exporter は少なくとも以下を「契約」とみなして扱います。

- `--provider` の受付名（利用者が指定する文字列）
- プロバイダごとの出力の安定（`export` の JSON 形や、HTML/Pug/React の出力仕様の互換性）

方針（推奨）:

- provider 名を変える場合は、旧名も当面はエイリアスとして残し、将来に削除する
- 出力仕様を変える場合は、差分が「誰にとって互換ではないか」を明記する（完全上書きか、後方互換か）

## 4. 破壊的変更チェックリスト

破壊的変更（または互換性が疑わしい変更）を入れる前に、最低限次を揃えます。

- 変更の対象（公開API/設定キー/exporter）と、互換ではない理由を 1 文で定義
- 影響範囲（CLI/VS Code/WebView/MCP のどれが影響か）を列挙
- 回帰ガード（少なくとも unit + 必要なら integration）を追加
- リリースノート（または移行ガイド）に「旧→新の読み替え」手順を添える

## 参照

- registry 互換レイヤ（`component-manifest` / `component-registry`）の import 方針・削除条件: [registry-compat-layer-policy.md](registry-compat-layer-policy.md)
- registry 以外も含めた **縮小の順序・PR 前チェックリスト**: [compat-layer-shrinkage-checklist.md](compat-layer-shrinkage-checklist.md)
- `docs/current/workflow-onboarding/SETTINGS.md`（設定単一ソース化と生成/同期）
- `docs/current/services-webview/contributes-commands.md`（command/mensues の単一ソース）
- `docs/current/services-webview/PROVIDER_CONTRACT.md`（provider の契約観点）
- `docs/archive/RELEASE_NOTES_v0.7.2.md` / `docs/archive/RELEASE_NOTES_v0.7.1.md` / `docs/archive/RELEASE_NOTES_v0.7.0.md`（運用例）

