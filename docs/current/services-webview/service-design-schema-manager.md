# サービス設計メモ: SchemaManager

## 目的 / 背景

- TextUI の DSL / テンプレート / テーマを **JSON Schema として VS Code（YAML 拡張）に結びつけ**、補完・検証の一貫性を保つ。
- スキーマファイルの **実体パス解決・キャッシュ・整合チェック**を一箇所に集約する。

## 構成上の要点

- **エントリ**: `src/services/schema-manager.ts` の `SchemaManager`。
- **パス**: 起動時に `resolveSchemaPaths`（`schema-path-resolver`）で main / template / theme のパスを決定。
- **キャッシュ**: `SchemaCacheStore` が main/template/theme ごとにロード結果を TTL 付きで保持（`ConfigManager` の `schemaCacheTTL`）。
- **ワークスペース登録**: `schema-workspace-registrar` が `yaml.schemas` 相当の登録を行う（IntelliSense / バリデーションの「見え方」に直結）。
- **整合**: `validateSchemaConsistency`（descriptor / schema の drift 検知）。
- **テンプレート派生**: `writeTemplateSchemaFromMainSchema` で main から template 用スキーマを生成。

## 外部契約（どのタイミングで何をするか）

- **`initialize()`**: テンプレートスキーマ生成 → `registerSchemas()`。失敗時はエラーを投げ、上位（`ServiceInitializer` のランタイムフェーズ）が扱う。
- **`reinitialize()` / `cleanup()`**: スキーマ再読み込み・登録解除。`DISPOSE_PHASES` の `schema` で `cleanup` が先に走る想定（`service-runtime-phases.ts`）。

## 不変条件

- **main スキーマファイルが無い**場合はログに出すが、コンストラクタは継続（実行時エラーになり得る）。運用では拡張パッケージにスキーマが同梱されていることが前提。
- **descriptor（`COMPONENT_DEFINITIONS`）と `schemas/schema.json` の oneOf** は別系統の正本がある。整合は `schema-descriptor-selectors` と consistency テストで担保（詳細は `docs/current/operations/MAINTAINER_GUIDE.md` の表）。

## よくある誤解・罠

- **「SchemaManager が DSL をパースする」わけではない** — 検証の本体は YAML パーサ + AJV 側。ここは **スキーマ資産の供給と登録**。
- `TEXTUI_SCHEMA_DEBUG` でログが増える。本番トラブル調査時のみ有効化を推奨。

## 関連リンク

- 実装: `src/services/schema-manager.ts`、`src/services/schema/`
- ランタイム初期化順: `docs/current/services-webview/service-registration.md`、`src/services/service-runtime-phases.ts`
- チケット: `T-20260320-024`（サービス設計メモ整備）
