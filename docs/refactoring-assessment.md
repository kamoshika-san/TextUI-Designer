# リファクタリング評価レポート

作成日: 2026-03-10

## 実施内容

- 既存のlint/テスト実行で品質ゲートを再確認
- `src/` の規模が大きいファイルを中心に責務分割余地を確認
- 既存の設計上の重複・条件分岐の集中箇所を抽出

## 現状サマリー

- `npm run lint` は成功（警告 0）
- `npm run test:all` は成功（unit/integration/e2e/regression 全通過）
- 回帰を壊す緊急度の高い不具合は見つかっていない

## 優先度つきリファクタリング候補

### P1: `src/cli/validator.ts` の責務分割

`validator.ts` は以下を単一ファイルで担当しており、変更影響範囲が広い状態です。

- JSON Schema 検証
- コンポーネント走査
- テーマ継承読み込み
- token 解決/循環検出

特に `collectFromComponentArray` ではコンポーネント種別ごとの再帰処理が直列で増えており、今後コンポーネント種別が増えるほど分岐が肥大化しやすいです。

**提案分割**

- `validator/schema-validator.ts`（Ajv関連）
- `validator/component-walker.ts`（コンポーネント列挙）
- `validator/theme-token-loader.ts`（theme探索/extends解決）
- `validator/token-resolver.ts`（token index/循環検知）

### P1: `src/cli/openapi-importer.ts` のレイヤー分離

OpenAPI読み込み、schema解決、field推論、DSL構築までを1ファイルで実装しており、テスト粒度が粗くなりやすい構造です。

**提案分割**

- `openapi-loader.ts`（読み込み/parse）
- `openapi-schema-resolver.ts`（`$ref`/`allOf`/`oneOf`）
- `openapi-field-mapper.ts`（Form field 推論）
- `openapi-dsl-builder.ts`（最終DSL組み立て）

### P2: exporter間の共通化強化

`html/react/pug` exporter がそれぞれ大きく、属性組み立て・ラベル付きフィールド描画などの共通ロジックが散在しています。`BaseComponentRenderer` はあるものの、UI要素ごとの「描画手順」共通化を追加するとメンテナンスコストが下げられます。

**提案**

- フィールドラッパー/属性ビルダーの共通ユーティリティ拡張
- component別に render spec を寄せる（テンプレート/戦略パターン）

### P3: テストのノイズ削減

現状テストは大量ログが標準出力に出ており、失敗時の本質ログを追いにくくなっています。

**提案**

- `LOG_LEVEL=test` で冗長ログを抑制する仕組み追加
- 主要アサーションに関係するログのみを出す設計へ整理

## 実行計画（最小リスク）

1. `validator.ts` の分割（内部API互換を保つ）
2. `openapi-importer.ts` の分割（公開関数は維持）
3. exporter共通化（snapshot/regressionテスト追加）
4. テストログ抑制（CIの可読性改善）

各段階で `npm run lint` と `npm run test:all` を実行し、回帰を防止する。
