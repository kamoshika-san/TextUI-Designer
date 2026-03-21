# token slot モデル案とテーマ拡張（Phase 6）

外部アーキ **Phase 6** の設計メモ。**ThemeStyleResolver の実装変更は含めない**（別チケット）。

## 背景（現状モデルの限界）

現行の descriptor では、コンポーネントごとに **`tokenStyleProperty` が 1 本**に寄せる構造が取りやすい（[MAINTAINER_GUIDE.md](MAINTAINER_GUIDE.md) のテーマ対応表、`token-style-property-map` 参照）。これはシンプルだが、次に弱い。

- **複数の style slot**（前景／背景／枠線などを独立に扱いたい）
- **semantic token**（ブランド色・意味付きトークン）
- **状態依存スタイル**（hover / disabled 等）
- **プレビューとエクスポートで異なる style 解決**（解像度やフォールバックの差）

## slot ベースへ拡張する考え方

**「トークン名 1 個を増やす」**のではなく、**スロット ID** をキーにしてテーマから値を引く。

### スロット ID の例（概念的）

| スロット例 | 意味（例） |
|------------|------------|
| `text.color` | テキスト既定の前景色 |
| `container.background` | コンテナ背景 |
| `button.primary.background` | プライマリボタン背景 |

- 階層は **`.` で区切る名前空間**のイメージ（実装時の区切り文字は別途決定）。
- コンポーネント種別・バリアント・状態は **スロット ID に含める**か、**別レイヤ（variant merge）**で合成するかを設計時に選ぶ。

## 既存 token との互換戦略

1. **既定スロットへのマッピング**  
   既存の単一 `tokenStyleProperty`（例: `color` に紐づく kebab 名）は、**「そのコンポーネントの既定 foreground スロット」**など **1 つのスロット ID**に対応付ける（後方互換の核）。

2. **テーマファイルの段階的拡張**  
   フラットな `theme.tokens.*` は維持しつつ、**新しい軸**（semantic・コンポーネント別オーバーライド）は **名前空間付きキー**や **ネスト**で追加する余地を残す。

3. **preview / export の差**  
   同じスロット ID でも、**出力フォーマット用 formatter**（CSS 変数・inline style・クラス名）を **resolver の外側**で差し替え可能にする（下記「Theme resolver」）。

## exporter 側の inline style（整理の方向）

現状、`getHtmlTokenStyleAttr` / `getReactTokenStyleProp` 系は **「プロパティ 1 本」前提**になりやすい。slot 化する場合は:

- **スロット ID → CSS プロパティ複数**（例: background + border-color）の対応表を持てるようにする
- もしくは **スロットごとに 1 つの CSS プロパティ**に正規化してから出力する

いずれも **本ドキュメントでは API 名を確定しない**（実装チケットで決める）。

## Theme resolver に期待する責務（概念）

次を **境界として分離**しやすいようにする（クラス分割は別チケット）。

1. **token lookup** — スロット ID から解決済み値（または参照）
2. **fallback** — 未定義時の既定・継承
3. **variant merge** — コンポーネント種別・variant・状態の上書き順
4. **output formatter** — HTML / React / プレビュー用インライン等への整形

## 完了条件（ロードマップ上の「設計ができた」とみなす目安）

- **「トークンを 1 つ増やす」だけではなく「テーマ軸を増やす」**要件に、上記の **slot + resolver 責務**で応えられる見通しが立つこと。

## 関連

- **スロット ID の命名規約（拡張時の衝突回避）**: [token-slot-naming-convention.md](token-slot-naming-convention.md)
- テーマ実装の現状説明（UI 切替中心）: [THEME_IMPLEMENTATION.md](THEME_IMPLEMENTATION.md)
- トークンとプレビュー／エクスポートの対応（保守ガイド）: [MAINTAINER_GUIDE.md](MAINTAINER_GUIDE.md) の該当表
