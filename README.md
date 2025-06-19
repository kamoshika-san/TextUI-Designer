# TextUI Designer

TextUI Designerは、YAML/JSONベースのDSLでフロントエンドUIを宣言的に設計し、VS Code上で即時プレビュー・型安全な編集体験を提供する拡張機能です。

## 主な特徴

- **YAML/JSON DSLでUI設計**: テキストだけでUIを記述し、バージョン管理やレビューも容易。
- **ライブプレビュー**: `TextUI: Open Preview` コマンドでWebViewプレビュー。保存時に自動リロード。
- **型安全・バリデーション**: JSON Schema + Ajvによる100%構文・型検証。ミスは即座に赤波線で検知。
- **豊富なコンポーネント**: Text, Alert, Divider, Input, Checkbox, Radio, Select, Button, Container, Form などをサポート。
- **Tailwind CSSベースの美しいUI**: カスタムCSS不要でモダンな見た目。

## 主な機能
- ライブプレビュー（WebView）
- JSON Schemaによる型安全なDSLバリデーション
- **IntelliSense（自動補完・型チェック）対応**
- **エラー箇所のハイライト（赤波線）**
- **スニペット入力補助（tui:form など）対応**
- ワンクリックでReact/Tailwind/Pug/HTMLへのエクスポート

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

1. `.tui.yml`ファイルを作成し、上記のようなDSLでUIを記述します。
2. コマンドパレットで`TextUI: Open Preview`を実行し、ライブプレビューを表示します。
3. ファイル保存時に自動でプレビューが更新されます。

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

## 必要要件
- VS Code 1.80以上
- Node.js 16以上（開発・ビルド時）

## 既知の問題
- スキーマや型定義の変更時は、拡張機能の再読み込みが必要な場合があります。
- 一部の複雑なレイアウトやカスタムCSSには未対応です。

## ライセンス
MIT

---

ご意見・ご要望はIssueまでお寄せください。
