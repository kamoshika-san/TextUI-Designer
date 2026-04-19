# T-028: fallback compatibility CSS 削減マトリクス

**正本**: `buildFallbackCompatibilityStyleBlock` → 実体は `src/exporters/html-template-builder.ts` の **`getFallbackCompatibilityStyleBlock`**。  
**スコープ**: ルール家族の歴史と **削除済みスライス**。**T-042〜T-044** により **`.textui-*` の compatibility 宣言は空**（プレースホルダコメントのみ）。実体は **バンドル WebView CSS**（`Badge.css` / `Progress.css` / `Button.css` 等）。

## 分類の凡例

| 分類 | 意味 |
|------|------|
| **Keep (Temporary)** | 現行の fallback 静的 HTML または互換テストがまだ依存。Primary の `webviewCss` だけでは吸収できない。 |
| **Absorbable** | Primary 側の WebView 既定 CSS またはコンポーネント側クラスと重複・近接しており、`webviewCss` 強化や Primary 契約テスト拡充後に縮小候補。 |
| **Delete candidate** | 重複・デッドパスが明確で、承認後にブロックを外して削除してよい候補（実削除は別作業）。 |

## ルール家族マトリクス（現在）

| 家族 | compatibility ブロック | 実体（正） |
|------|-------------------------|------------|
| すべての `.textui-*` 互換宣言 | **Removed（T-042〜T-044）** — ブロック内は **コメントのみ** | `Badge.css` / `Progress.css` / `Button.css` / `Tabs.css` / `Divider.css` 等の **バンドル CSS**（`readWebviewCssIfPresent`） |

## 削除順序（要約・完了）

1. **T-032** submit · **T-035** progress-default · **T-037** Divider+Badge サイズ · **T-039** Progress バリアント · **T-040** Tabs · **T-042〜T-044** Badge 全体 + Progress 骨格 + Button（danger/ghost/disabled を `Button.css` に移設）→ **SSoT セレクタ数 0**。

## 削除候補（≥1 本チケット要件）

| 候補 | 理由 | 状態 |
|------|------|------|
| **`.textui-button.submit` ブロック** | `.textui-button.primary` と同一宣言の重複。 | **実削除済み（T-032）** |
| **`.textui-progress-default` ブロック** | `.textui-progress-fill` と同一宣言の重複。 | **実削除済み（T-035）** |
| **Divider family（`.textui-divider` / `.vertical`）** | `webviewCss` の `Divider.css` と重複。 | **実削除済み（T-037）** |
| **Badge サイズ（`.textui-badge-sm` / `.textui-badge-md`）** | `webviewCss` の `Badge.css` と重複。 | **実削除済み（T-037）** |
| **Progress バリアント（`.textui-progress-primary` ～ `.error`）** | `Progress.css` と重複。 | **実削除済み（T-039）** |
| **Tabs ブロック（`.textui-tabs` ～ `.textui-tab-active`）** | `Tabs.css` + レンダラ DOM と冗長。 | **実削除済み（T-040）** |
| **Badge ベース＋バリアント（compat ブロック全体）** | `Badge.css` と重複。 | **実削除済み（T-042）** |
| **Progress 骨格（compat）** | `Progress.css` と重複。 | **実削除済み（T-043）** |
| **Button（compat）＋ danger/ghost/disabled** | `Button.css` に集約。 | **実削除済み（T-044）** |

## 関連

- [export-fallback-lane-boundary-policy.md](./export-fallback-lane-boundary-policy.md)  
- [t021-fallback-removal-criteria.md](./t021-fallback-removal-criteria.md)  
