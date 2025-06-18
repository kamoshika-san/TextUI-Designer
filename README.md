# TextUI Designer

TextUI Designerは、YAML/JSONベースのDSLでフロントエンドUIを宣言的に設計し、VS Code上で即時プレビュー・型安全な編集体験を提供する拡張機能です。

## 主な特徴

- **YAML/JSON DSLでUI設計**: テキストだけでUIを記述し、バージョン管理やレビューも容易。
- **ライブプレビュー**: `TextUI: Open Preview` コマンドでWebViewプレビュー。保存時に自動リロード。
- **型安全・バリデーション**: JSON Schema + Ajvによる100%構文・型検証。ミスは即座に赤波線で検知。
- **豊富なコンポーネント**: Text, Alert, Divider, Input, Checkbox, Radio, Select, Button, Container, Form などをサポート。
- **Tailwind CSSベースの美しいUI**: カスタムCSS不要でモダンな見た目。
- **IntelliSense（自動補完・型チェック）対応**
- **エラー箇所のハイライト（赤波線）**

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

## 必要要件
- VS Code 1.80以上
- Node.js 16以上（開発・ビルド時）

## 既知の問題
- スキーマや型定義の変更時は、拡張機能の再読み込みが必要な場合があります。
- 一部の複雑なレイアウトやカスタムCSSには未対応です。

## エラー箇所のハイライト（赤波線）について

- `*.tui.yml`/`*.tui.json`ファイルで、スキーマバリデーションエラーが発生した箇所に**赤波線**が表示されます。
- エラー箇所にマウスオーバーすると、**エラーメッセージ（例: 必須プロパティの欠落、型不一致など）**がツールチップで表示されます。
- エラーが修正されると、赤波線が即座に消えます。
- 複数エラーも同時にハイライトされます。

### 使い方例
```yaml
components:
  - Input:
      name: username
      # labelが必須なのに未入力 → label: の行に赤波線が表示される
      type: text
      required: true
```

## ライセンス
MIT

---

ご意見・ご要望はIssueまでお寄せください。
