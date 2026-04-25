# Obsidian プラグイン展開に向けたコードベース整理（優先度付き）

作成日: 2026-04-25

## 目的

TextUI Designer の現行コードベース（VS Code 拡張中心）を、将来的に Obsidian プラグインへ展開しやすい構造へ整理する。

---

## 優先度リスト

### P0（最優先）: Host API 境界の明確化（`vscode` 依存の隔離）

**現状観察**
- サービス層の公開インターフェース自体が `vscode.*` 型を直接含んでいる（例: `WebviewPanel`, `Disposable`, `TextDocument`, `Uri`, `Completion*`）。
- `ServiceFactory` が VS Code 前提の実装を直接 new しており、DI の入口はあるが Host 差し替えの単位が粗い。

**なぜ最優先か**
- Obsidian 対応の最大障壁は Host API 差分。ここを先に抽象化しないと、以降の機能移植がすべて高コスト化する。

**整理方針**
- `src/types/services.ts` から `vscode` 型を段階的に排除し、`src/platform/host-types.ts`（新設）などの中立型へ置換。
- `vscode` 固有処理は adapter 層へ寄せる（例: `src/platform/vscode/*`）。
- 既存サービスは「アプリケーションサービス（Host 中立）」と「Host adapter」に分割。

**完了条件（DoD）**
- `src/types/services.ts` から `import * as vscode from 'vscode'` が消える。
- Host 中立インターフェースに対して VS Code / Obsidian adapter がそれぞれ実装可能な形になる。

---

### P1: Composition Root の二重化（VS Code / Obsidian の起動分離）

**現状観察**
- `src/extension.ts` → `ExtensionLifecycleManager` → `ServiceInitializer/ServiceFactory` という VS Code 前提の起動連鎖。
- 起動時に VS Code 固有のイベント・通知・WebView 構築が密結合。

**なぜ高優先か**
- Host 境界を定義しても、起動経路が一つだと実運用で分岐が増え、可読性と保守性が悪化する。

**整理方針**
- `bootstrap-vscode.ts` と `bootstrap-obsidian.ts`（新設）へ分割。
- 共有初期化は `createApplicationRuntime({ hostAdapter, featureFlags })` へ集約。
- `ServiceFactory` は Host neutral factory + Host-specific bindings の 2 層へ再編。

**完了条件（DoD）**
- VS Code 側エントリが `bootstrap-vscode` を呼ぶだけになる。
- Obsidian 側の最小起動（コマンド 1 つ + パース検証）が同じ Runtime で動く。

---

### P2: コマンド／設定／マニフェストの宣言モデル統合

**現状観察**
- `package.json` の `contributes` に VS Code 固有の設定・コマンド・メニュー条件が大量に定義される。
- コード側のコマンド登録は `CommandManager` / `command-catalog` で整理されているが、Host 非依存な「機能定義」の単一ソースにはなっていない。

**なぜ高優先か**
- Obsidian は manifest / settings / command 登録方式が異なるため、宣言モデルを共通化しないと二重管理が発生する。

**整理方針**
- `capabilities`（例: コマンドID、必要入力、UI露出可否、設定キー）を Host 中立 JSON/TS で定義。
- VS Code `contributes` と Obsidian manifest への変換器を build-time で生成。
- `check:contributes` 系ガードに「capability SSoT 逸脱検知」を追加。

**完了条件（DoD）**
- 新規コマンド追加時、編集箇所が capability 定義 1 か所 + 必要な host adapter のみになる。

---

### P3: Preview 実行基盤の Host 非依存化（WebView ハンドリング再設計）

**現状観察**
- `WebViewManager` が `vscode.WebviewPanel` を直接扱い、テーマ同期・メッセージ配信・ファイル探索を一体で保持。
- UI 資産（`src/renderer` + `media/`）は再利用可能だが、コンテナ実装が VS Code に固定。

**なぜ中〜高優先か**
- Obsidian でも Preview は価値中核。ここを中立化すると移植インパクトが最大。

**整理方針**
- `PreviewHostBridge`（postMessage, mount, theme apply, lifecycle）を定義。
- `WebViewManager` を `PreviewController`（中立）と `VscodePreviewHost`（adapter）へ分割。
- ファイルIO (`fs`, `path`) は `FileSystemPort` に抽出。

**完了条件（DoD）**
- Preview 更新ロジックが Host 非依存テストで動作。
- VS Code 側は bridge 実装差し替えのみで既存機能を維持。

---

### P4: テスト基盤の「グローバル require フック依存」縮小

**現状観察**
- `tests/setup.js` で `Module.prototype.require` をフックして `vscode` モジュールを全面モック化。
- この方式は現行 VS Code 拡張には有効だが、Host 複数化時に副作用範囲が広い。

**なぜ中優先か**
- 多 Host での回帰検知の信頼性を上げるには、グローバルフックより adapter contract テスト中心へ移行すべき。

**整理方針**
- 共通テストは Host 中立レイヤのみを対象にし、Host adapter は個別 contract test へ。
- `tests/setup.js` は最小限の既存互換に残し、新規テストでは依存禁止ルールを強化。

**完了条件（DoD）**
- 新規主要機能のテストが `Module.prototype.require` フック非依存で成立。

---

### P5: 配布単位の再編（Core ライブラリ化）

**現状観察**
- `TextUICoreEngine` は比較的 Host 非依存で、CLI/MCP からも再利用されている。
- 一方で配布単位は単一拡張パッケージ中心。

**なぜ中優先か**
- Obsidian だけでなく将来の他 Host 展開（web app / CI bot）にも効く投資。

**整理方針**
- `@textui/core`（DSL 正規化・検証・差分・エクスポート）と `@textui/host-vscode`（拡張連携）相当へ論理分離。
- まずは monorepo 化ではなく、同一 repo 内サブパッケージ or build target 分離から開始。

**完了条件（DoD）**
- CLI/MCP/VSCode/Obsidian が同じ core artifact を参照し、Host 固有コードが混入しない。

---

## 先に手を付けると効果が高い「最初の 2 週間」

1. **Host 中立 interface の PoC を 1 本作る**（`IWebViewManager` 周辺）。
2. **起動経路を `bootstrap-vscode` に寄せる薄いリファクタ**（挙動不変）。
3. **capability 定義の雛形作成**（既存コマンド 2〜3 個だけ移行）。
4. **PreviewController の単体テスト雛形**（vscode モック非依存）。

---

## 補足（現状の強み）

- DSL 型の SSoT（`src/domain/dsl-types`）方針が明確で、型境界を守るためのガードテストも充実している。
- Core Engine はすでに CLI/MCP から利用されており、Host 中立化の足場がある。

このため、最初に Host API 境界の整理（P0/P1）を実施すれば、Obsidian 展開の実装速度は大きく改善できる。
