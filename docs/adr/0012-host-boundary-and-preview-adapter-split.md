# ADR 0012: Host Boundary と Preview Adapter の分離

- Status: Accepted
- Date: 2026-04-25

## Context

現行コードでは、サービス契約や実装に `vscode` 型が露出しており、Host 追加（Obsidian）時に横断改修が必要になる。特に `IWebViewManager` の `vscode.WebviewPanel` 露出と、`WebViewManager` の UI Host / File IO 同居が移植コストを高める。

## Decision

1. アプリ層契約から `vscode` 型を段階除去し、`*Like` 中立型に置換する。
2. Preview 経路を次の2層に分離する。
   - `PreviewController`（Host 非依存）
   - `VscodePreviewHost`（VS Code adapter）
3. 起動/DI は将来的に以下へ整理する。
   - `bootstrap-vscode`
   - `createApplicationRuntime`（共通）
4. テストは adapter contract test を増やし、グローバル require フック依存を増やさない。

## Consequences

### Positive
- Host 追加時の変更範囲が adapter 層に限定される。
- Core / App ロジックの再利用性が上がる。
- 境界違反を静的ガードで検知しやすい。

### Negative
- 一時的に型変換コード（adapter）が増える。
- 既存テストの見直しコストが発生する。

## Rollout Plan

- Sprint1: 境界棚卸し・中立型ポリシー・本ADR確定
- Sprint2: interface 置換と変換層導入
- Sprint3: Preview adapter 分割と composition root の分離
- Sprint4: テスト/CI ガード強化

## Alternatives Considered

1. **現状維持（VS Code 専用最適化）**
   - 却下。Obsidian 展開の都度、横断変更が必要になる。
2. **全面 rewrite**
   - 却下。リスク/コストが高く段階移行に不向き。

## References

- `src/types/services.ts`
- `src/services/webview-manager.ts`
- `src/services/service-factory.ts`
- `src/extension.ts`
- `tests/setup.js`
