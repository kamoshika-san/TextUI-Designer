# TextUI Designer - サンプルファイル集

このディレクトリには、TextUI Designer のテーマシステムとコンポーネントの使用例が含まれています。

## 📁 ファイル構成

| ファイル | 説明 | 用途 |
|---------|------|------|
| `sample-theme.yml` | **実用的なサンプルテーマ** | プロジェクトで実際に使用できるモダンなブルーテーマ |
| `theme-demo.tui.yml` | **テーマデモファイル** | 全コンポーネントを使用したテーマシステムの動作確認 |
| `sample.tui.yml` | **基本サンプル** | TextUI Designer の基本的な使用方法 |
| `component-style-test.tui.yml` | **コンポーネントテスト** | 各コンポーネントの動作確認用 |

## 🚀 クイックスタート

### 1. テーマシステムを体験する

```bash
# 1. サンプルテーマをプロジェクトルートにコピー
cp sample/sample-theme.yml ../textui-theme.yml

# 2. VS Code でテーマデモファイルを開く
code sample/theme-demo.tui.yml

# 3. プレビューを開く
# コマンドパレット（Ctrl+Shift+P）-> "TextUI: Open Preview"
```

### 2. テーマをリアルタイムで編集する

1. **プレビューを開いた状態で**
2. **プロジェクトルートの `textui-theme.yml` を編集**
3. **ファイル保存するとプレビューが即座に更新**

#### 試してみる変更例:

```yaml
# textui-theme.yml で以下を変更してみてください

# 1. プライマリカラーを変更
tokens:
  color:
    primary: "#FF6B6B"  # 青 → 赤に変更

# 2. スペーシングを大きくする
tokens:
  spacing:
    md: "2rem"  # 1rem → 2rem に変更

# 3. フォントを変更
tokens:
  typography:
    fontFamily:
      primary: "'Georgia', serif"  # Inter → Georgia に変更
```

## 🎨 テーマファイルの詳細

### `sample-theme.yml` の特徴

- **モダンなデザイン**: 実用的で洗練されたブルーベーステーマ
- **完全なコンポーネントサポート**: 全10種類のコンポーネントに対応
- **デザイントークンベース**: カラー・スペーシング・タイポグラフィを一元管理
- **CSS変数自動生成**: `var(--color-primary)` 形式で統一されたスタイル適用
- **豊富なコメント**: カスタマイズ方法を詳しく説明

### デザイントークン構成

```yaml
theme:
  tokens:
    color:          # カラーパレット
    spacing:        # スペーシングスケール
    typography:     # タイポグラフィ設定
    borderRadius:   # 角丸設定
    shadows:        # シャドウ設定
    transition:     # アニメーション設定
  components:       # コンポーネント固有スタイル
```

## 📋 使用例集

### 基本的なテーマ適用

```yaml
# sample.tui.yml - テーマが自動適用
page:
  components:
    - Button:
        kind: primary     # → theme.components.button.primary が適用
        label: "送信"
    - Input:
        label: "名前"     # → theme.components.input が適用
        type: text
```

### カスタムテーマの作成

```yaml
# custom-theme.yml
theme:
  name: "My Custom Theme"
  tokens:
    color:
      primary: "#Your-Color"  # お好みの色に変更
      # ... 他の設定
```

## 🔧 カスタマイズガイド

### 1. カラーパレットのカスタマイズ

```yaml
tokens:
  color:
    primary: "#3B82F6"    # メインブランドカラー
    secondary: "#6B7280"  # セカンダリカラー
    success: "#10B981"    # 成功状態
    warning: "#F59E0B"    # 警告状態
    error: "#EF4444"      # エラー状態
```

**おすすめカラーパレット:**
- **企業ブランド**: primary をブランドカラーに設定
- **ダークモード**: surface と background を暗い色に変更
- **アクセシビリティ**: コントラスト比を4.5:1以上に保つ

### 2. スペーシングの調整

```yaml
tokens:
  spacing:
    xs: "0.25rem"  # 4px  - 細かい調整
    sm: "0.5rem"   # 8px  - 小さな余白
    md: "1rem"     # 16px - 標準余白
    lg: "1.5rem"   # 24px - 大きな余白
    xl: "2rem"     # 32px - セクション間
```

**調整のコツ:**
- **統一感**: 8px ベースのスケールを維持
- **デバイス対応**: rem 単位でレスポンシブ対応
- **視覚的階層**: サイズ差を明確にして階層を作る

### 3. タイポグラフィの設定

```yaml
tokens:
  typography:
    fontFamily:
      primary: "'Inter', sans-serif"    # メインフォント
      monospace: "'JetBrains Mono', monospace"  # コード用
    fontSize:
      xs: "0.75rem"   # 12px - キャプション
      sm: "0.875rem"  # 14px - 小テキスト
      base: "1rem"    # 16px - 標準
      lg: "1.125rem"  # 18px - 強調
      xl: "1.25rem"   # 20px - 小見出し
```

**フォント選択のガイドライン:**
- **可読性**: 小さなサイズでも読みやすいフォント
- **ブランド**: 企業・プロジェクトのトーンに合致
- **パフォーマンス**: Web フォントの読み込み速度を考慮

## 🎯 実践的な使用パターン

### パターン1: 企業サイト向け

```yaml
# corporate-theme.yml
theme:
  tokens:
    color:
      primary: "#1E40AF"     # 企業ブルー
      secondary: "#64748B"   # ニュートラルグレー
    typography:
      fontFamily:
        primary: "'Roboto', sans-serif"
```

### パターン2: ダークモード対応

```yaml
# dark-theme.yml
theme:
  tokens:
    color:
      surface: "#1F2937"     # ダークグレー背景
      background: "#111827"  # より暗い背景
      text:
        primary: "#F9FAFB"   # ライトテキスト
```

### パターン3: 高コントラスト（アクセシビリティ重視）

```yaml
# high-contrast-theme.yml
theme:
  tokens:
    color:
      primary: "#000000"     # 黒
      background: "#FFFFFF"  # 白
      text:
        primary: "#000000"   # 黒テキスト
```

## 🔍 トラブルシューティング

### よくある問題と解決方法

#### 1. テーマが適用されない
- **確認点**: `textui-theme.yml` がプロジェクトルートに配置されているか
- **解決法**: ファイルパスと名前を確認し、正しい場所に配置

#### 2. プレビューが更新されない
- **確認点**: ファイル保存時にエラーが表示されていないか
- **解決法**: YAML 構文エラーを修正し、スキーマ検証をクリア

#### 3. 色が反映されない
- **確認点**: CSS 変数名が正しく記述されているか
- **解決法**: `var(--color-primary)` の形式で記述

## 📚 参考リンク

- **メインドキュメント**: `../README.md` - TextUI Designer の全機能説明
- **スキーマ定義**: `../schemas/theme-schema.json` - テーマファイルの型定義
- **GitHub Issues**: バグ報告・機能要望
- **GitHub Discussions**: 質問・アイデア共有

## 💡 Tips & Tricks

### 効率的なテーマ開発

1. **デバッグ用テーマ**: 目立つ色で変更箇所を確認
2. **段階的開発**: デザイントークン → コンポーネントスタイルの順
3. **バージョン管理**: テーマファイルも Git で管理
4. **チーム共有**: `.tui.yml` と `textui-theme.yml` をセットで共有

### パフォーマンス最適化

- **必要最小限の定義**: 使用しないスタイルは削除
- **CSS変数の活用**: 重複するスタイル値を統一
- **キャッシュ活用**: TextUI Designer の自動キャッシュを活用

---

**🎉 これで TextUI Designer のテーマシステムを完全に活用できます！**

何か質問や要望があれば、GitHub Issues までお気軽にお寄せください。 