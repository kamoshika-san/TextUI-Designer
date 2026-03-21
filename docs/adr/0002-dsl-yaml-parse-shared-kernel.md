# ADR 0002: DSL YAML 構文パースの共有カーネル（第1スライス）

## ステータス

**採用（第1スライス完了）** — 以降のスライスで include 解決・スキーマ検証の上流統合を進める前提とする。

## コンテキスト

次の経路で、いずれも **`setImmediate` + `YAML.parse(text)`** という同一パターンが独立実装されていた。

- プレビュー用 `YamlParser`（`src/services/webview/yaml-parser.ts`）
- 診断用 `DiagnosticValidationEngine`（`src/services/diagnostics/diagnostic-validation-engine.ts`）
- 補完用 `SchemaCompletionEngine.parseYamlForSyntaxValidation`（`src/services/schema-completion-engine.ts`）

構文パースの挙動やスケジューリングが経路ごとに分岐すると、**軽微な修正の取りこぼし**や **valid/invalid の微妙な不一致**の温床になる。

[ADR 0001](0001-document-analysis-service.md) の **DocumentAnalysisService（仮称）** は、将来的に parse / include / validate を単一上流へ寄せる構想である。第1スライスでは **リスクが低く境界が明確な「構文パースのみ」**を共有モジュールに切り出す。

## 決定

- **`src/dsl/yaml-parse-async.ts`** に **`parseYamlTextAsync(text: string): Promise<unknown>`** を定義し、上記 3 経路から呼び出す。
- **スキーマ検証・include 解決・エラー型の全面統一**は本スライスでは行わない（別 PR／後続スライス）。

## 結果

- 構文パースの **単一実装**と **単体テスト**（`tests/unit/yaml-parse-async.test.js`）で回帰を担保する。
- 次スライスでは、診断／プレビュー／補完の **検証入力**をこのカーネルから供給する形への拡張を検討する。

## 関連

- 親チケット: T-20260321-067（parse / validate 共有カーネル）
- ADR 0001（DocumentAnalysisService 構想）
