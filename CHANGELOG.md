# Change Log

All notable changes to the "textui-designer" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [0.0.1] - 2025-06-18

- Initial release

## [0.0.2] - 2025-06-18
### 追加・改善
- IntelliSense（自動補完・型チェック）機能の拡充（コンポーネント名・プロパティ名・値の補完、属性説明の充実）
- エラー箇所のハイライト（赤波線）機能を追加
- スニペット機能（tui:form, tui:input, tui:container, tui:alert など）を追加
- READMEに各機能の説明・使い方・例を追記

## [0.0.3] - 2025-06-18
### Added
- コマンドパレットから「TextUI: 新規テンプレート作成」コマンドでテンプレートファイル（フォーム・一覧・空など）を新規作成できる機能を追加
- テンプレート種別選択、保存先・ファイル名指定、内容自動挿入、エディタ自動オープンに対応
- 既存ファイル上書き防止やバリデーションも実装
- 作成したテンプレートはIntelliSense・型チェック・ライブプレビューに対応
- READMEに本機能の使い方・作成例を追記

## [0.0.4] - 2025-06-20
### 追加・改善
- プレビュー画面・エディタのどちらからでもワンクリックでエクスポート可能に（WebView上のExportボタン、コマンドパレット両対応）
- アクティブなエディタがなくても、最後に開いていた`.tui.yml`ファイルを自動でエクスポート対象に
- 静的HTMLエクスポートのダークモード対応・Tailwind CSS組み込み
- プレビュー画面とエクスポートHTMLのスタイルを完全統一（Tailwindクラス・textui-container等のカスタムクラスも反映）
- VS Codeテーマ変数の影響を排除し、常に意図したデザインで出力
- ExportボタンのUIを控えめなデザインに変更、重複表示や動作不良も解消
- エクスポート時にDSLバリデーションエラーがあればブロックし、エラーメッセージを表示
- READMEにワンクリックExport機能の詳細・使い方・注意点を追記