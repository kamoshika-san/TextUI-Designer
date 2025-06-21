# テーマ切り替え機能の実装

## 概要

TextUI Designerにライト/ダークテーマ切り替え機能を実装しました。ユーザーは手動でテーマを切り替えることができ、VSCodeのテーマ設定と連動することも可能です。

## 実装内容

### 1. ThemeToggleコンポーネント

**ファイル**: `src/renderer/components/ThemeToggle.tsx`

- 3つのテーマモードをサポート：
  - **自動（🔄）**: VSCodeのテーマ設定と連動
  - **ライト（☀️）**: ライトテーマを強制適用
  - **ダーク（🌙）**: ダークテーマを強制適用

- 機能：
  - クリックでテーマモードを循環切り替え
  - localStorageでユーザー設定を永続化
  - VSCodeからのテーマ変更通知を受信
  - bodyクラスでテーマ状態を管理

### 2. CSSスタイル

**ファイル**: `src/renderer/index.css`

- ダークモード（デフォルト）のスタイル
- ライトモード用のスタイル（`.light`クラス）
- 全コンポーネントに対応：
  - テキスト（h1, h2, h3, p, small, caption）
  - アラート（info, success, warning, error）
  - フォーム要素（input, select, checkbox, radio）
  - ボタン（primary, secondary, submit）
  - 区切り線（horizontal, vertical）
  - コンテナ

### 3. VSCode拡張側の実装

**ファイル**: `src/extension.ts`

- VSCodeのテーマ変更を監視
- WebViewにテーマ変更を通知
- `onDidChangeActiveColorTheme`イベントを使用

**ファイル**: `src/services/webview-manager.ts`

- `notifyThemeChange`メソッドを追加
- WebViewにテーマ変更メッセージを送信

### 4. WebView側の実装

**ファイル**: `src/renderer/webview.tsx`

- ThemeToggleコンポーネントをインポート
- テーマ変更メッセージの処理
- 右上にテーマ切り替えボタンを配置

## 使用方法

### テーマ切り替え

1. TextUI Designerのプレビューを開く
2. 右上のテーマ切り替えボタンをクリック
3. 以下の順序で切り替わります：
   - 自動（🔄）→ ライト（☀️）→ ダーク（🌙）→ 自動（🔄）

### VSCode連動

- テーマモードが「自動」の場合、VSCodeのテーマ設定と連動
- VSCodeでテーマを変更すると、自動的にWebViewのテーマも変更

### 設定の永続化

- ユーザーが選択したテーマモードはlocalStorageに保存
- ページをリロードしても設定が維持される

## 技術仕様

### テーマ状態管理

```typescript
type ThemeMode = 'light' | 'dark' | 'auto';
```

### CSSクラス

- ダークモード: デフォルト（クラスなし）
- ライトモード: `.light`クラス

### メッセージ形式

```typescript
// VSCode → WebView
{
  type: 'theme-change',
  theme: 'light' | 'dark'
}
```

### localStorage

```typescript
// 保存
localStorage.setItem('textui-theme-mode', themeMode);

// 読み込み
const savedMode = localStorage.getItem('textui-theme-mode') as ThemeMode;
```

## テスト

### テストファイル

`theme-test.tui.yml` - 全コンポーネントのテーマ切り替えをテスト

### テスト手順

1. `theme-test.tui.yml`を開く
2. プレビューを表示
3. テーマ切り替えボタンをクリック
4. 各コンポーネントの色が適切に変更されることを確認

## 今後の改善点

1. **アニメーション**: テーマ切り替え時のスムーズなトランジション
2. **カスタムテーマ**: ユーザー定義のテーマカラー
3. **アクセシビリティ**: 高コントラストモードのサポート
4. **設定画面**: テーマ設定の詳細オプション

## 関連Issue

- [Issue #18: ライト／ダークを切り替えるスイッチ設置](https://github.com/kamoshika-san/TextUI-Designer/issues/18) 