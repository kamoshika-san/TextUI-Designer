# P0-S1-T1: `vscode` 露出 API 棚卸し（Boundary Inventory）

作成日: 2026-04-25  
対象スプリント: P0 / Sprint 1

## 目的

Obsidian 展開の前提として、`vscode` 依存境界を **Interface / Factory / Entry point** の3層で可視化し、移行優先順位を確定する。

## 対象範囲

- `src/types/services.ts`
- `src/services/service-factory.ts`
- `src/extension.ts`
- `src/services/webview-manager.ts`
- `tests/setup.js`（テスト基盤の境界）

---

## 1) Interface 境界マトリクス（`src/types/services.ts`）

| Interface | `vscode` 露出 | リスク | 移行方針 | 優先度 |
|---|---|---|---|---|
| `IWebViewManager` | `getPanel(): vscode.WebviewPanel` | 高（UI Host 固有型が契約に露出） | `PanelHandle` / `PreviewHostBridge` へ置換。VS Code 側で adapter 実装 | P0 |
| `ISettingsService` | `startWatching(): vscode.Disposable`, `hasConfigurationChanged(vscode.ConfigurationChangeEvent)` | 高（設定変更イベント差分） | `DisposableLike`, `ConfigChangeEventLike` を中立化 | P0 |
| `IDiagnosticManager` | `validateAndReportDiagnostics(vscode.TextDocument)`, `clearDiagnosticsForUri(vscode.Uri)` | 高（Document/URI 抽象欠如） | `TextDocumentLike`, `UriLike` を導入し adapter 変換 | P0 |
| `ICompletionProvider` | `vscode.Position`, `vscode.CancellationToken`, `vscode.Completion*` | 高（補完 API が Host 強依存） | 補完返却型を App domain 値へ寄せ、Host で変換 | P0 |
| `ISchemaManager` | 直接露出なし | 低 | 現状維持（IO adapter のみ整理） | P1 |
| `IThemeManager` | 直接露出なし | 低 | 現状維持（必要なら FileSystemPort 経由化） | P1 |
| `IExportManager` / `IExportService` / `ITemplateService` / `ICommandManager` | 直接露出なし | 低 | 現状維持 | P1 |

---

## 2) Composition Root 境界（`ServiceFactory` / `extension.ts`）

| レイヤ | 観測 | リスク | Sprint1 での決定事項 |
|---|---|---|---|
| Entry point (`extension.ts`) | `vscode.ExtensionContext` を直接受け取り lifecycle を駆動 | Host 追加時に分岐集中 | `bootstrap-vscode` 薄型化を次スプリント候補として固定 |
| ServiceFactory | VS Code 実装を直接 `new` して束ねる | Host ごとの差し替え粒度が粗い | Common runtime + host bindings の2層分割方針を固定 |
| WebViewManager | `vscode.WebviewPanel` / `fs` / `path` を同居 | UI Host / File IO が混在 | `PreviewController` + `VscodePreviewHost` 分割を固定 |

---

## 3) テスト境界（`tests/setup.js`）

| 観測 | リスク | Sprint1 方針 |
|---|---|---|
| `Module.prototype.require` をフックし `vscode` をグローバルモック | 複数 Host 化時に副作用範囲が大きい | 新規テストではグローバル require フック依存を増やさない |
| `global.vscode` を注入 | 契約テストの粒度が荒くなる | adapter 単位の contract test を別系統化 |

---

## 4) 優先チケット（Sprint2 への受け渡し）

1. `IWebViewManager` から `vscode.WebviewPanel` を除去（最優先）
2. `ISettingsService` の `Disposable` / `ConfigurationChangeEvent` を中立イベントへ変換
3. `IDiagnosticManager` / `ICompletionProvider` の Host 型境界を adapter へ移譲
4. `ServiceFactory` の host binding 分離

---

## 5) Sprint1 完了判定

- Interface 境界の **P0対象が列挙済み**である。
- 境界ごとに **移行先の中立型名**が確定している。
- 次スプリントで着手する順序が合意されている。
