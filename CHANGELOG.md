# Change Log

All notable changes to the "textui-designer" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

- Initial release

## [0.0.2] - 2024-06-xx
### 追加・改善
- IntelliSense（自動補完・型チェック）機能の拡充（コンポーネント名・プロパティ名・値の補完、属性説明の充実）
- エラー箇所のハイライト（赤波線）機能を追加
- スニペット機能（tui:form, tui:input, tui:container, tui:alert など）を追加
- READMEに各機能の説明・使い方・例を追記

## [0.0.3] - 2024-06-XX
### Added
- コマンドパレットから「TextUI: 新規テンプレート作成」コマンドでテンプレートファイル（フォーム・一覧・空など）を新規作成できる機能を追加
- テンプレート種別選択、保存先・ファイル名指定、内容自動挿入、エディタ自動オープンに対応
- 既存ファイル上書き防止やバリデーションも実装
- 作成したテンプレートはIntelliSense・型チェック・ライブプレビューに対応
- READMEに本機能の使い方・作成例を追記