# TextUI Designer - サンプルファイル集

サンプルは**使い方別**にフォルダ分けしています。目的に合ったフォルダを開いてください。

## フォルダ一覧

| フォルダ | 用途 | 最初に開くファイル |
|----------|------|---------------------|
| **[01-basic](01-basic/)** | 基本コンポーネントの使い方 | `sample.tui.yml` |
| **[02-theme](02-theme/)** | テーマ（textui-theme.yml）の使い方 | `theme-demo.tui.yml` |
| **[03-include](03-include/)** | テンプレート分割（$include） | `include-sample.tui.yml` |
| **[04-include-cyclic](04-include-cyclic/)** | 循環参照の検証（エラー確認用） | `cycle-test.tui.yml` |
| **[05-theme-inheritance](05-theme-inheritance/)** | テーマ継承（extends）の使い方 | `inheritance-demo.tui.yml` |

各フォルダ内の `README.md` に、ファイルの説明と使い方が書いてあります。

## クイックスタート

1. **まずは基本から**: `01-basic/sample.tui.yml` を開く → コマンドパレットで「TextUI: Open Preview」
2. **テーマを試す**: `02-theme/README.md` の手順で `textui-theme.yml` をプロジェクトルートにコピー → `02-theme/theme-demo.tui.yml` でプレビュー
3. **$include を試す**: `03-include/include-sample.tui.yml` を開いてプレビュー（ネストしたテンプレートと params の動作確認）
4. **テーマ継承を試す**: `05-theme-inheritance/README.md` の手順でテーマ一式をコピー → `inheritance-demo.tui.yml` で継承結果を確認

## 参考

- **メインドキュメント**: [../README.md](../README.md) - TextUI Designer の全体説明
- **スキーマ**: `../schemas/` - DSL の型定義
- **テーマ詳細**: 従来のテーマカスタマイズガイドは [01-basic](01-basic/) および [02-theme](02-theme/) の README と、リポジトリ内の `doc/` を参照
