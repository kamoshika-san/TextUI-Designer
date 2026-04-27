# TextUI Designer — Obsidian プラグイン 設計ドキュメント

> **ステータス**: Future / 設計フェーズ  
> **作成**: 2026-04-27 (Architect)  
> **前提決定**: T-20260427-009 で Core/Domain/DSL の vscode 依存を ESLint でブロック済み

---

## 1. 目標

TextUI DSL（`.tui.yml`）の プレビュー・エクスポート機能を Obsidian プラグインとして提供する。  
Vault 内の DSL ファイルを Obsidian の Reading View / Live Preview に統合し、VSCode 拡張と同等の UX を実現する。

---

## 2. アーキテクチャ方針

### 2.1 Port / Adapter パターン

```
┌─────────────────────────────────────────┐
│            textui-core (純粋 TS)         │
│  src/core/, src/domain/, src/dsl/       │
│  ─ vscode 依存なし (T-009 で保護済み)    │
└────────────────┬────────────────────────┘
                 │ Port interfaces
       ┌─────────┴──────────┐
       ▼                    ▼
┌─────────────┐    ┌─────────────────────┐
│  VSCode     │    │  Obsidian Plugin    │
│  Adapter    │    │  Adapter (新規)      │
│ src/services│    │ obsidian-plugin/    │
│ src/bootstrap│   │ src/               │
└─────────────┘    └─────────────────────┘
```

### 2.2 再利用可能レイヤー（変更なし）

| ディレクトリ | 内容 | 再利用 |
|---|---|---|
| `src/core/` | DSL エンジン・Diff | ✅ そのまま |
| `src/domain/` | DSL 型定義 | ✅ そのまま |
| `src/dsl/` | YAML パーサ | ✅ そのまま |
| `src/exporters/` | HTML/React/Pug 出力 | ✅ vscode 依存確認後 |
| `src/renderer/` | React WebView コンポーネント | ⚠️ Obsidian ItemView でラップ |

### 2.3 Obsidian 専用実装（新規）

| モジュール | 役割 |
|---|---|
| `Plugin` エントリ | `obsidian.Plugin` を継承、Vault イベント登録 |
| `FileSystemPort` adapter | `obsidian.Vault` API → Core の IO ポートに変換 |
| `PreviewItemView` | `obsidian.ItemView` で React レンダラーをマウント |
| `ExportCommand` | `obsidian.Command` 登録 → Core エクスポート呼び出し |

---

## 3. リポジトリ構成（将来）

```
textui-core/              ← npm パッケージ化（Phase 2 で分離）
  package.json
  src/core/, src/domain/, src/dsl/

textui-vscode/            ← 現行リポジトリ
  package.json
  dependencies: "textui-core": "workspace:*"  # 分離前は monorepo
  src/services/, src/bootstrap/, src/renderer/

textui-obsidian/          ← 新規リポジトリ（Phase 1 で作成）
  package.json
  dependencies: "textui-core": "file:../textui-core"  # Phase 1 は相対参照
  src/ (Plugin, adapters, ItemView)
```

> **Phase 1 判断**: npm publish せず `file:` 参照で開発開始。publish は Obsidian コミュニティ審査通過後。

---

## 4. 実装フェーズ

### Phase 1: プレビュー MVP（着手可能）

**目標**: Vault 内の `.tui.yml` を開いたとき、サイドパネルにプレビューを表示する

- `obsidian.Plugin.onload()` で `.tui.yml` の拡張子を登録
- `ItemView` に React (`ReactDOM.createRoot`) でレンダラーをマウント
- Core エンジン（`TextUiCoreEngine.normalizeForPreview`）を直接呼び出し
- ファイル変更は `Vault.on('modify')` で検知してリレンダー
- **スコープ外**: ナビゲーションフロー、Diff、MCP

### Phase 2: エクスポート

- `obsidian.Command` で HTML/React エクスポートを呼び出し
- 出力先は Vault 内の `_export/` フォルダ（設定可能）
- `src/exporters/html-exporter.ts` を Core 経由で使用

### Phase 3: MCP 統合

- Obsidian プラグインから MCP サーバを起動
- VSCode 側と同じ `src/mcp/` ロジックを流用（Node 環境依存箇所の確認が必要）

---

## 5. 技術的制約・リスク

| 項目 | 内容 |
|---|---|
| Obsidian の Node API | デスクトップ版は Node.js 利用可。モバイルは Node API 制限あり → Phase 1 はデスクトップのみ |
| React バンドル | Obsidian はバンドラー（esbuild）必須。`src/renderer/` の tsconfig を共有不可 → 別途 `esbuild.config.mjs` を用意 |
| CSS スコープ | Obsidian テーマとの CSS 衝突リスク → プレビュー DOM を Shadow DOM でラップ |
| `src/exporters/` の vscode 依存 | 一部ファイルに vscode 依存の可能性 → Phase 2 着手前に ESLint チェック実施 |
| Obsidian API 安定性 | `ItemView` / `Vault` は安定 API。Beta API は使用しない |

---

## 6. 着手判断基準

以下が満たされた時点で Phase 1 着手を推奨:

- [ ] `textui-core` の npm パッケージ境界が固まっている（`exports` フィールド定義済み）
- [ ] `src/renderer/` の依存が Core のみになっている（vscode 依存ゼロ）
- [ ] Obsidian プラグイン開発環境（esbuild + Obsidian Plugin Template）のセットアップ完了

---

## 7. Next Action

- **PM**: Phase 1 MVP チケットを起票する前に、`src/renderer/` の vscode 依存調査スプリントを先行させること
- **Developer**: `src/exporters/` の vscode import を `npm run lint` でチェックして汚染度を報告すること（Phase 2 準備）
