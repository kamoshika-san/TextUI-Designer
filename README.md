# TextUI Designer

TextUI Designerは、YAML/JSONベースのDSLでフロントエンドUIを宣言的に設計し、VS Code上で即時プレビュー・型安全な編集体験を提供する拡張機能です。

## 主な特徴

- **YAML/JSON DSLでUI設計**: テキストだけでUIを記述し、バージョン管理やレビューも容易。
- **📱 最適化されたライブプレビュー**: `TextUI: Open Preview` コマンドで快適な編集環境。プレビューを右側、編集画面を左側に自動配置し、編集に集中できる設計。
- **🔍 詳細エラー表示**: YAML構文エラー・スキーマバリデーションエラーを行番号・修正提案付きで表示。
- **型安全・バリデーション**: JSON Schema + Ajvによる100%構文・型検証。ミスは即座に赤波線で検知。
- **豊富なコンポーネント**: Text, Alert, Divider, Input, Checkbox, Radio, Select, Button, Container, Form などをサポート。
- **Tailwind CSSベースの美しいUI**: カスタムCSS不要でモダンな見た目。
- **🚀 パフォーマンス最適化**: キャッシュ機能と差分更新により、大規模UIでも高速レンダリング。
- **⚡ スマートキャッシュ**: レンダリング結果を自動キャッシュし、変更箇所のみ効率的に更新。
- **📊 パフォーマンス監視**: リアルタイムでのレンダリング時間・メモリ使用量・キャッシュ効率を可視化。

## 主な機能
- **📱 最適化されたライブプレビュー（WebView）**
  - プレビューを右側、編集画面を左側に自動配置
  - ファイルツリーから別ファイルを開いてもプレビューが隠れない設計
  - リアルタイム更新で編集内容を即座に反映
- **🔍 高度なエラー表示・デバッグ機能**
  - YAML構文エラーの詳細表示（行番号・列番号・エラー箇所のハイライト）
  - スキーマバリデーションエラーの具体的な修正提案
  - よくあるYAML構文ミスの自動検出（TAB文字、コロン不足、インデントエラーなど）
- **JSON Schemaによる型安全なDSLバリデーション**
- **IntelliSense（自動補完・型チェック）対応**
- **エラー箇所のハイライト（赤波線）**
- **スニペット入力補助（tui:form など）対応**
- **ワンクリックでReact/Tailwind/Pug/HTMLへのエクスポート**
- **🚀 パフォーマンス最適化機能**
  - スマートキャッシュシステム（TTL付き）
  - 差分更新による効率的なレンダリング
  - バッチエクスポート機能
- **📊 パフォーマンス監視・分析**
  - リアルタイムパフォーマンスメトリクス
  - キャッシュヒット率・差分更新効率の可視化
  - メモリ使用量の監視

## サンプルDSL（sample.tui.yml）

```yaml
page:
  id: sample-mvp
  title: "MVPコンポーネントサンプル"
  layout: vertical
  components:
    - Text:
        variant: h1
        value: "MVPコンポーネントサンプル"
    - Text:
        variant: h2
        value: "MVPコンポーネントサンプル"
    - Alert:
        variant: info
        message: "これはインフォメーションアラートです"
    - Alert:
        variant: warning
        message: "これは警告アラートです"
    - Divider:
        orientation: horizontal
    - Input:
        label: "名前"
        name: "name"
        type: text
        required: true
    - Input:
        label: "メールアドレス"
        name: "email"
        type: email
        required: true
    - Checkbox:
        label: "利用規約に同意する"
        name: "agree"
        required: true
    - Radio:
        label: "性別"
        name: "gender"
        options:
          - label: "男性"
            value: "male"
          - label: "女性"
            value: "female"
          - label: "その他"
            value: "other"
    - Select:
        label: "国"
        name: "country"
        options:
          - label: "日本"
            value: "jp"
          - label: "アメリカ"
            value: "us"
          - label: "イギリス"
            value: "uk"
    - Divider:
        orientation: horizontal
    - Container:
        layout: horizontal
        components:
          - Button:
              kind: primary
              label: "送信"
              submit: true
          - Button:
              kind: secondary
              label: "キャンセル"
    - Container:
        layout: horizontal
        components:
          - Input:
              label: "test-box"
              name: "test-name"
              type: text
          - Input:
              label: "test-box"
              name: "test-name"
              type: text
    - Form:
        id: "sample-form"
        fields:
          - Input:
              label: "ユーザー名"
              name: "username"
              type: text
              required: true
          - Input:
              label: "パスワード"
              name: "password"
              type: password
              required: true
          - Checkbox:
              label: "ログイン状態を保持"
              name: "remember"
        actions:
          - Button:
              kind: submit
              label: "ログイン"
              submit: true
```

## 使い方

### 🚀 基本的な使い方
1. **ファイル作成**: `.tui.yml`ファイルを作成し、上記のようなDSLでUIを記述します。
2. **プレビュー表示**: コマンドパレット（`Ctrl+Shift+P`）で`TextUI: Open Preview`を実行
3. **自動レイアウト**: プレビューが右側、編集画面が左側に自動配置され、編集に集中できます
4. **リアルタイム更新**: ファイル保存時に自動でプレビューが更新されます

### 🔍 エラー診断機能
- **YAML構文エラー**: 構文エラーが発生した場合、詳細な行番号・エラー箇所・修正提案が表示されます
- **スキーマエラー**: コンポーネントの型やプロパティエラーも具体的な修正方法と共に表示
- **ライブエラー検証**: 編集中にリアルタイムでエラーを検出・表示

### 💡 効率的な編集
- **IntelliSense**: コンポーネント名・プロパティの自動補完
- **スニペット**: `tui:form`等のテンプレートで高速入力
- **エクスポート**: プレビュー画面またはコマンドパレットからワンクリックでHTML/React/Pug形式に出力

## サポートコンポーネント一覧
- Text（h1, h2, h3, p, small, caption）
- Alert（info, warning, success, error）
- Divider（horizontal, vertical）
- Input（text, email, password, number）
- Checkbox
- Radio
- Select
- Button（primary, secondary, submit）
- Container（horizontal, vertical, flex, grid）
- Form

---

## IntelliSense（自動補完・型チェック）について

- `*.tui.yml`/`*.tui.json`ファイルで、コンポーネント名・プロパティ名・値の補完候補が表示されます。
- スキーマに基づく型エラーや必須項目の未入力は赤波線で警告されます。
- 補完候補を選択すると、説明（description）もツールチップで表示されます。

### 使い方例
```yaml
components:
  - Input:
      label: ユーザー名
      name: username
      type: text # ← 候補がポップアップ
      required: true # ← true/falseも補完
```

---

## スニペット機能について

主要なTextUIコンポーネントのテンプレートを、Tab補完やコマンドパレットから素早く挿入できます。

- `tui:form` … フォーム一式のテンプレート
- `tui:input` … 入力欄のテンプレート
- `tui:container` … レイアウト用コンテナのテンプレート
- `tui:alert` … アラートのテンプレート

### 使い方
1. `*.tui.yml` または `*.tui.json` ファイルで、`tui:form` などと入力
2. Tabキーや補完候補から選択すると、テンプレートが展開されます
3. `$1`, `$2` などの変数位置にカーソル移動しながら編集できます

### 例（tui:form）
```yaml
- Form:
    id: myForm
    fields:
      - Input:
          label: ユーザー名
          name: username
          type: text
    actions:
      - Button:
          kind: primary
          label: 送信
          submit: true
```

---

## コマンドパレットからの新規テンプレート作成

TextUI Designerでは、コマンドパレットから簡単にテンプレートファイル（フォーム・一覧・空など）を新規作成できます。

### 使い方

1. **コマンドパレットを開く**  
   `Ctrl+Shift+P`（または`F1`）でコマンドパレットを開きます。

2. **「TextUI: 新規テンプレート作成」を選択**  
   `TextUI: 新規テンプレート作成` と入力し、コマンドを選択します。

3. **テンプレート種別を選ぶ**  
   「フォーム」「一覧」「空」など、用途に応じたテンプレート種別を選択します。

4. **保存先・ファイル名を指定**  
   ダイアログが表示されるので、保存先フォルダとファイル名（例：`myform.template.yml`）を指定します。

5. **テンプレート内容が自動挿入された新規ファイルが開く**  
   選択したテンプレート内容が自動で挿入された新規ファイルがエディタで開きます。  
   そのまま編集・プレビューが可能です。

### ポイント

- テンプレートファイルは `.template.yml` などの拡張子で保存されます。
- 作成したテンプレートは、通常の `.tui.yml` ファイルと同様にIntelliSenseや型チェック、ライブプレビューが利用できます。
- テンプレート内容は今後も拡充予定です。

---

**例：フォームテンプレート作成の流れ**

1. コマンドパレットで「TextUI: 新規テンプレート作成」を選択  
2. 「フォーム」を選択  
3. `myform.template.yml` というファイル名で保存  
4. 以下のような内容が自動で挿入される

```yaml
- Form:
    id: myForm
    fields:
      - Input:
          label: ユーザー名
          name: username
          type: text
    actions:
      - Button:
          kind: primary
          label: 送信
          submit: true
```

---

## ワンクリックExport機能（2025年6月強化）

- **プレビュー画面・エディタのどちらからでもワンクリックでエクスポート可能**
  - プレビューWebView上の「Export」ボタン、またはコマンドパレットから実行できます。
  - アクティブなエディタがなくても、最後に開いていた`.tui.yml`ファイルを自動でエクスポート対象にします。
- **出力形式**
  - 静的HTML（Tailwind CSS組み込み、ダークモード対応）
  - React + Tailwind、Pugテンプレート（今後拡張予定）
- **プレビュー画面とエクスポートHTMLのスタイル完全統一**
  - Tailwind CSSクラス・カスタムクラス（例: `textui-container`）を両方で同一適用
  - VS Codeテーマ変数の影響を排除し、常に意図したデザインで出力
  - ダークモードで見やすい配色・レイアウトを標準化
- **エクスポートボタンのUI改善**
  - プレビュー画面のExportボタンは控えめなデザイン（薄いグレー背景・小さめ・透明度あり）
  - ボタンの重複表示や動作不良も解消済み
- **エクスポート時のバリデーション**
  - DSLにエラーがある場合はエクスポートをブロックし、エラーメッセージを表示

### 使い方（エクスポート）
1. `.tui.yml`ファイルを開き、プレビュー画面を表示
2. プレビュー画面右上の「Export」ボタン、またはコマンドパレットで`TextUI: Export to Code`を実行
3. 静的HTMLファイルなどが自動生成され、エディタで開くかファイルとして保存されます

> **補足**: エクスポートファイルには`textui-container`などのカスタムクラスのスタイルも自動付与され、プレビューと完全に同じ見た目になります。

---

## 🚀 パフォーマンス最適化機能（v0.0.5）

TextUI Designer v0.0.5では、大規模UIでも高速なレンダリングを実現するパフォーマンス最適化機能を導入しました。

### ⚡ スマートキャッシュシステム

- **TTL付きキャッシュ**: レンダリング結果を自動キャッシュし、設定可能な有効期限で管理
- **メモリ効率**: 最大キャッシュサイズを制御し、メモリ使用量を最適化
- **フォーマット別管理**: HTML/React/Pug各形式を個別にキャッシュし、効率的な再利用

### 🔄 差分更新システム

- **変更検出**: DSLの変更箇所を自動検出し、変更されたコンポーネントのみを更新
- **部分更新**: 大規模UIでも変更箇所のみの効率的なレンダリング
- **更新効率の可視化**: 差分更新の効率をパフォーマンスメトリクスで確認

### 📊 パフォーマンス監視

- **リアルタイム測定**: レンダリング時間、キャッシュヒット率、メモリ使用量をリアルタイムで監視
- **詳細レポート**: パフォーマンス統計の詳細レポートを生成
- **開発者向け機能**: デバッグ用の詳細メトリクス表示

### 🎛️ パフォーマンス設定

VS Code設定で以下のパフォーマンス関連設定をカスタマイズできます：

```json
{
  "textui-designer.performance.cacheTTL": 10000,
  "textui-designer.performance.enablePerformanceLogs": false,
  "textui-designer.performance.webviewDebounceDelay": 300
}
```

### 📈 パフォーマンス向上効果

- **初回レンダリング**: 通常通り（キャッシュ未ヒット時）
- **2回目以降**: キャッシュヒットにより大幅な高速化
- **部分更新**: 変更箇所のみの更新により、大規模UIでも高速レスポンス
- **メモリ使用量**: 効率的なキャッシュ管理により最適化

---

## インストール・動作要件
- **VS Code**: 1.80以上
- **Node.js**: 16以上（開発・ビルド時のみ）
- **対応OS**: Windows, macOS, Linux

## 品質・テスト状況
- **✅ 172個のテスト全てパス**: 単体・統合・E2Eテストによる品質保証
- **✅ 手動回帰テスト完了**: 主要機能の動作確認済み
- **✅ パフォーマンステスト**: メモリ使用量・レンダリング時間最適化済み
- **✅ VS Code Marketplaceリリース準備完了**

## 既知の制限
- 複雑なカスタムCSS・JavaScript連携には対応していません
- 1MB以上の大規模YAMLファイルでは警告が表示される場合があります

## サポート・コミュニティ
- **GitHub Issues**: バグ報告・機能要望
- **GitHub Discussions**: 質問・アイデア共有
- **ドキュメント**: `/doc` フォルダ内の詳細ガイド

## ライセンス
MIT License - 商用利用・改変・再配布自由

---

**TextUI Designer** で、テキストだけで美しいUIを構築しましょう！  
ご意見・ご要望は [GitHub Issues](https://github.com/your-repo/textui-designer/issues) までお寄せください。
