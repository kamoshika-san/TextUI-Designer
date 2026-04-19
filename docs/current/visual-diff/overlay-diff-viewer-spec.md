# Overlay Diff Viewer 仕様

Updated: 2026-04-05
Owner: Maintainer
Audience: Maintainer, Contributor, PM

## Background

- 既存のビジュアルDiff機能は「前回レンダリング状態 vs 現在」の自動比較のみで、任意の2つのDSLファイルを指定して比較する手段がない
- 「印刷した2枚の図案を透かして差分を確認する」UXアナロジーに基づき、オーバーレイ方式の比較機能を新設する

## Scope

**対象:**
- 任意の2つの `.tui.yml` ファイルを指定したオーバーレイ比較
- スライダーによるクロスフェード（透過度操作）
- 既存コンポーネントレンダラーの流用

**対象外:**
- ライブ更新（ファイル変更の自動反映）
- 差分のテキスト/ツリー表示
- 既存ビジュアルDiff（`diff-webview-deliver.ts` ベース）の変更

---

## Requirements

### UX

1. コマンド `textui-designer.openOverlayDiff` をコマンドパレットおよびエディタタイトルバー（YAML ファイル時）から呼び出せること
2. 起動時、アクティブエディタの `.tui.yml` が DSL A（Before）として自動設定されること
3. ファイル選択ダイアログで DSL B（After）をユーザーが選択できること
4. 既存プレビューパネルとは独立した新しい WebView パネルが開くこと

### パネル UI

```
┌──────────────────────────────────────────────────────────────┐
│ [Before: file-a.tui.yml]  ←────スライダー────→  [After: file-b] │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Layer A (opacity: 1 - slider/100)                          │
│  Layer B (opacity: slider/100)  [pointer-events: none]      │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### スライダー動作（クロスフェード方式）

| スライダー値 | Layer A opacity | Layer B opacity | 見え方 |
|---|---|---|---|
| 0% | 1.0 | 0.0 | DSL A のみ表示 |
| 50% | 0.5 | 0.5 | 両方50%ずつ（差分がゴーストとして見える） |
| 100% | 0.0 | 1.0 | DSL B のみ表示 |

計算式: `opacityA = 1 - slider/100`、`opacityB = slider/100`

---

## 技術設計

### アーキテクチャ判断

| 項目 | 選択 | 理由 |
|---|---|---|
| Webviewバンドル | 既存 `webview.tsx` を拡張（モード追加） | 新バンドルはビルド設定変更が必要で過剰。既存の `conflictResult` / `diffResult` 切替パターンと一致 |
| モード検出 | `webview-ready` 受信後に init メッセージ送信 | HTMLテンプレート変更不要。既存パターンと一致 |

### メッセージプロトコル追加

```
Extension → Webview:
  { type: 'overlay-diff-init', dslA: TextUIDSL, fileNameA: string, dslB: TextUIDSL, fileNameB: string }

Webview → Extension:
  { type: 'webview-ready' }  ← 既存。受信後に上記を送信
```

### 新規作成ファイル（5ファイル）

| ファイル | 役割 |
|---|---|
| `src/domain/diff/overlay-diff-types.ts` | `OverlayDiffState`・`OverlayDiffInitMessage` 型定義 |
| `src/services/commands/open-overlay-diff-command.ts` | ファイル解決・YAML並列パース・パネル起動 |
| `src/services/webview/overlay-diff-lifecycle-manager.ts` | WebView パネルの作成・破棄（viewType: `textuiOverlayDiff`） |
| `src/services/webview/overlay-diff-message-handler.ts` | `webview-ready` 受信→画像URI解決→`overlay-diff-init` 送信 |
| `src/renderer/components/OverlayDiffViewer.tsx` | スライダー + 2レイヤー絶対配置 React コンポーネント |

### 変更ファイル（8ファイル）

| ファイル | 変更内容 |
|---|---|
| `src/services/command-catalog-deps.ts` | `openOverlayDiff: () => Promise<void>` を追加 |
| `src/services/command-catalog.ts` | `CORE_COMMAND_CATALOG` にエントリを追加 |
| `src/services/command-feature-registries.ts` | `openOverlayDiff` のバインドを追加 |
| `src/services/service-factory.ts` | `OverlayDiffLifecycleManager` を遅延シングルトンとして追加 |
| `src/utils/webview-utils.ts` | メッセージブリッジの `switch` に `case 'overlay-diff-init':` を追加 |
| `src/renderer/use-webview-messages.ts` | `onOverlayDiffInit` コールバックと `case 'overlay-diff-init':` を追加 |
| `src/renderer/webview.tsx` | `overlayDiffState` state 追加・`<OverlayDiffViewer>` への早期リターン追加 |
| `package.json` | `contributes.commands` / `editor/title` メニューへの追加 |

### OverlayDiffViewer コンポーネント構造

```tsx
const OverlayDiffViewer: React.FC<{ state: OverlayDiffState }> = ({ state }) => {
  const [slider, setSlider] = useState(50);
  const opacityA = 1 - slider / 100;
  const opacityB = slider / 100;

  return (
    <div className="overlay-diff-root">
      <div className="overlay-diff-header">
        <span>Before: {basename(state.fileNameA)}</span>
        <input type="range" min={0} max={100} value={slider}
               onChange={e => setSlider(Number(e.target.value))} />
        <span>After: {basename(state.fileNameB)}</span>
      </div>
      <div className="overlay-diff-canvas" style={{ position: 'relative' }}>
        <div style={{ opacity: opacityA, position: 'absolute', top: 0, left: 0, width: '100%' }}>
          {state.dslA.page?.components?.map((comp, i) => renderRegisteredComponent(comp, i))}
        </div>
        <div style={{ opacity: opacityB, position: 'absolute', top: 0, left: 0, width: '100%', pointerEvents: 'none' }}>
          {state.dslB.page?.components?.map((comp, i) => renderRegisteredComponent(comp, i))}
        </div>
      </div>
    </div>
  );
};
```

### 実装順序

1. `overlay-diff-types.ts`（型定義：全ファイルの基盤）
2. `overlay-diff-lifecycle-manager.ts` → `overlay-diff-message-handler.ts`
3. `open-overlay-diff-command.ts`
4. コマンド登録（catalog-deps → catalog → feature-registries → service-factory）
5. `webview-utils.ts`（メッセージブリッジ追加）
6. `OverlayDiffViewer.tsx`（React コンポーネント）
7. `use-webview-messages.ts` → `webview.tsx`（React 統合）
8. `package.json` + `npm run sync:commands`

---

## Non-Functional Notes

- スライダー操作は React state のみで完結するため、Extension との通信なし（低遅延）
- 既存プレビューパネルとは完全に独立しており、互いに影響なし
- `renderRegisteredComponent` 流用により、新コンポーネント追加時も自動対応

---

## Constraints

- `resolveImageSourcesInDsl()` はパネル作成後（`asWebviewUri` が使える状態）に呼ぶこと
- `package.json` とコマンドカタログの同期が必要（`npm run sync:commands` で検証）
- `OverlayDiffLifecycleManager` は遅延シングルトンで構築（ExtensionContext のスレッディングを最小化）

---

## Verification

```bash
# ビルドエラーなし
npm run compile

# コマンドカタログとpackage.jsonの差異なし
npm run sync:commands

# 動作確認
# 1. コマンドパレットから「TUI: Diff」（透かし比較 / Overlay Diff）を実行
# 2. 2つの .tui.yml を指定してパネルが開くことを確認
# 3. スライダーを操作して Layer A/B の透過度が変わることを確認
# 4. 構成の異なる2ファイルで 50% 時にゴースト差分が見えることを確認
```

## Change History

- 2026-04-05: created
