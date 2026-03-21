# Export ランタイムと WebView 実装の結合点（棚卸し・T-20260321-114）

**目的**: Architect バックログ回答（Export runtime の WebView 実装依存縮退）の **第 1 スライス**として、現状の結合箇所を列挙し、縮退の起点を共有する。

## 既知の境界ルール

- **T-110**: WebView レーンから Export ランタイムへの **直接 import 禁止**（`eslint.config.mjs`・[import-boundaries-4-lanes.md](import-boundaries-4-lanes.md)）。
- **逆方向**（Export → WebView の React/TSX 実装）の依存は本ドキュメントのスコープ。

## 結合の主なパターン

| 区分 | 代表パス / モジュール | 備考 |
|------|----------------------|------|
| **静的 React 出力** | `src/exporters/react-static-export.ts` | HTML exporter の primary 経路。WebView プレビュー用 React 実装とのコード共有が集中しやすい。 |
| **テンプレ／断片** | `react-template-renderer.ts`・`react-basic-renderer.ts`・`react-form-control-templates.ts` | コンポーネント種別ごとのレンダリング。`renderer/types` からの型 import が多い（[dsl-types-renderer-types-inventory.md](dsl-types-renderer-types-inventory.md) と重複参照）。 |
| **非 React exporter** | `base-component-renderer.ts`・`html-renderers/*`・`pug/*` | 文字列生成系。Preview diff / component-map との共有ユーティリティに注意。 |
| **プレビュー観測** | `src/utils/preview-capture*.ts` | キャプチャ経路。Export 本流とプレビューの import グラフが交差しうる。 |

## 縮退の次ステップ（提案・未起票）

1. **共有境界の明示**: 「Export 専用」「Preview 専用」のモジュール境界を `exporter-boundary-guide.md` に 1 節追加する。
2. **react-static-export の分割**: WebView 専用フックと共有カーネルを分離し、Export 側は **安定した小さな façade** からのみ参照する。
3. **結合テストの置き場**: 統合テストが WebView バンドルに依存する場合は adapter 経由に寄せる（T-104 系の続き）。

## 参照

- `Inbox-PM/2026-03-21_Architect_reply_PM_backlog_EF_next.md`（Vault）
- [exporter-boundary-guide.md](exporter-boundary-guide.md)
- [observability-and-cache-boundary.md](observability-and-cache-boundary.md)
