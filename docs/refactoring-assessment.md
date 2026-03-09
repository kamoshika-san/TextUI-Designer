# リファクタリング評価レポート（2026-03-09 更新）

## 現在の状態（結論）

- `npm run lint` / `npm test` はともに通過し、現時点で**機能破綻を示す兆候は見つかりません**。
- 一方で、今後の機能追加時に変更衝突が起きやすい「責務集中ポイント」はまだ残っています。

## 優先度付きリファクタリング候補

### P1: `YamlParser` の責務分離（パース・include解決・スキーマ検証）

**観測**
- `parseYamlFile()` が I/O 選択、サイズ検証、パース、`$include` 解決、スキーマ検証までを直列で実行しています。
- `validateYamlSchema()` 内で毎回 `new Ajv()` を生成しており、連続更新時に不要な初期化コストが発生し得ます。

**提案**
- `YamlContentReader`（入力取得）
- `IncludeResolver`（`$include` 展開 + 循環検出）
- `SchemaValidator`（Ajvインスタンスをキャッシュ）

に分割し、`YamlParser` はオーケストレーション専用に縮小。

---

### P1: `ServiceInitializer` の生成責務と起動責務の分離

**観測**
- `initialize()` の中で DI（各サービス生成）・初期化順序制御・MCP設定・テーマ監視開始までを一括実行しています。
- 失敗時のロールバック戦略が暗黙的で、今後依存が増えると部分失敗の扱いが複雑化します。

**提案**
- `ServiceFactory`（生成のみ）
- `ServiceLifecycle`（initialize/cleanup の順序制御）
- `BootstrapTasks`（MCP設定やテーマ監視の起動）

に分割して、起動フローの可視性を上げる。

---

### P2: `HtmlExporter` のマークアップ生成重複の共通化

**観測**
- `renderInput` / `renderSelect` / `renderDatePicker` で「ラベル + フィールド + disabled/required 属性付与」の定型処理が繰り返されています。
- 文字列テンプレート連結（`let code += ...`）が多く、差分レビュー時にロジック変更とマークアップ変更が混ざりやすいです。

**提案**
- `renderLabeledField({ label, fieldHtml })` のような小ヘルパーを導入。
- 属性組み立ては `buildHtmlAttrs()` を設けて共通化（disabled/required/min/max/value など）。

---

### P2: `ConfigManager` の設定定義の単一化

**観測**
- `getPerformanceSettings()` のデフォルト値群と `resetConfiguration()` のキー列挙が別管理で、設定追加時に更新漏れリスクがあります。
- `package.json` 側の contributes.configuration とも実質的に二重管理になるため、将来的に整合性崩れが起きやすい構造です。

**提案**
- 設定キー定義を `const SETTINGS = {...}` に集約。
- `get*Settings()`・`resetConfiguration()`・（必要なら）スキーマ生成を同じ定義から導出する。

## 今回は見送りでよい項目

- 既存テストは広範囲をカバーしており、すぐに全面的な再分割を行うよりも、上記 P1 から段階的に進めるのが安全です。
- 特に `YamlParser` と `ServiceInitializer` は依存点が多いため、1PRで一気に触るより「抽出 → 既存呼び出し置換 → テスト補強」の3段階を推奨します。
