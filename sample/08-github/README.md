# 08-github サンプル

GitHub のリポジトリトップページ（Code タブ＋README＋右サイドバー）を、DSL とデザイントークンで再現したサンプルです。実リポジトリ（kamoshika-san/TextUI-Designer）の構成に合わせてあります。

## 内容

- **ヘッダー**: リポジトリ名「kamoshika-san / TextUI-Designer」と説明文
- **アクション**: Watch / Star / Fork ボタン
- **タブ**: Code / Issues / Pull requests / Actions / Projects / Wiki / Security / Insights / Settings
- **Code タブ**
  - ブランチ選択、「Go to file」「Add file」「Code」（緑）ボタン
  - **ファイル一覧（Table）**: Name・Last commit message・Updated（.github, docs, media, sample, src, tests, AGENTS.md, package.json, README.md など）
  - **README.md 本文**: # TextUI Designer、プロジェクト概要、開発コマンド（表）、テスト・WebView・ライセンスなどのセクション
- **右サイドバー**: About（説明・トピック）、Releases、Packages、Languages（言語割合）、Contributors
- **Issues / Pull requests タブ**: New issue / New pull request ボタンと一覧または説明

## デザイントークン（GitHub Theme）

同フォルダの **`textui-theme.yml`** に GitHub 風のデザイントークンを定義しています。

- **カラー**: プライマリ緑 `#238636`（Code / New issue ボタン）、セカンダリ背景 `#f6f8fa`、枠線 `#d0d7de`、テキスト `#1f2328` / `#656d76` など
- **コンポーネント**: ボタン（primary 緑・secondary 白枠）、テキストの色・サイズ
- **トークン参照**: `sample.tui.yml` の各コンポーネントに `token: color.primary` などを指定し、テーマの色を参照

## 使い方

1. `sample/08-github/sample.tui.yml` を開く
2. コマンドパレットで「TUI: Preview」を実行
3. プレビュー上部のテーマ選択で **「GitHub Theme」** を選ぶと、GitHub に近い見た目になります（このフォルダに `textui-theme.yml` があるため、同じフォルダから開いていれば GitHub Theme が一覧に表示されます）

スキーマ・トークン検証:

- `npm run validate:samples`
- `node out/cli/index.js validate --file sample/08-github/sample.tui.yml --json`  
  （同フォルダの `textui-theme.yml` が自動で参照されます）

## 注意

GitHub の見た目を再現するための**レイアウト・トークン例**であり、実際の GitHub API やリンクは含みません。
