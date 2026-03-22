# Theme Resolver の責務分離（lookup / fallback / variant merge / output formatter）

Epic4（テーマスロット）に向けた **設計メモ**。本書は **実装クラス名の確定やリファクタ手順の確定を目的としない**。境界の言語化と、後続チケット（T201–T203）が参照できる **責務マップ**を正とする。

## 目的

- テーマ解決を **「トークンを 1 つ増やす」**レベルではなく、**スロット ID・variant・状態・出力先**を扱えるようにするため、処理を混在させない。
- 既存の [`token-slot-model-and-theme-extension.md`](token-slot-model-and-theme-extension.md) の「Theme resolver に期待する責務」を、**コードベース上の実装レイヤ**と対応づけて固定する。

## 現状のコード上の位置づけ（2026-03-22 時点）

| 領域 | 主な入口 | 役割の要約 |
|------|----------|------------|
| DSL 上の `token` プロパティと YAML テーマ | [`src/cli/theme-token-resolver.ts`](../src/cli/theme-token-resolver.ts) の `resolveDslTokens` | テーマファイル読込・`extends`・`{tokenRef}` の **参照解決**・循環検出。値は主に **スカラーへ畳み込む**方向。 |
| エクスポート用の theme style ルール | [`src/components/definitions/theme-style-rules.ts`](../src/components/definitions/theme-style-rules.ts) + [`src/exporters/theme-style-resolver.ts`](../src/exporters/theme-style-resolver.ts) の `ThemeStyleResolver` | 宣言（selector / property / `varKey` / `fallback` / `raw`）を **CSS 文字列**にする。**現状は slot・variant merge は未モデル化**。 |
| **プレビュー用インライン style（スロット語彙）** | [`src/renderer/token-inline-style-from-definition.ts`](../src/renderer/token-inline-style-from-definition.ts) の `tokenToPreviewInlineStyle` | descriptor の `defaultTokenSlot` と [`token-style-property-map.ts`](../src/components/definitions/token-style-property-map.ts) の `slotIdToTuiCssVarName` を使い、**エクスポート（`BaseComponentRenderer`）と同じ** `var(--tui-slot-…, <token>)` 形に整形する（**T-203**）。 |

**注意**: 「resolver」という語が **CLI の token 解決**と **ThemeStyleResolver**の両方で使われる。本書では **責務名（lookup 等）**で区別し、将来のクラス分割は T201–T203 側で命名する。

## 四つの責務（境界）

### 1. Token lookup（参照解決）

- **入力**: スロット ID（または移行期の単一トークンキー）、テーマ由来のインデックス（フラット／ネストはテーマスキーマ次第）。
- **出力**: 解決済みの値、または **さらに辿るべき参照**（間接参照を許す場合）。
- **やらないこと**: CSS や React props の **文字列整形**、variant の上書き順の最終決定（それは 3 へ）。

**既存対応の例**: `theme-token-resolver.ts` の `resolveTokenValue` は **lookup + 循環検出**に相当。スロット ID 導入後も **「テーマ辞書から値を取る」**部分はここに集約しやすい。

### 2. Fallback（未定義・欠落時の既定）

- **入力**: lookup の結果が「未定義」または「型不一致」であること。
- **出力**: 採用する値（リテラル、継承元、別キーへの委譲など）。
- **方針**: プレビューとエクスポートで **フォールバックの厳しさ**が変わりうる（警告を出す／黙って既定値）ため、**ポリシー**は formatter や上位オーケストレーションと混ぜない。ただし **「どの順で候補を試すか」**のルール自体は本責務に書く。

**既存対応の例**: `ThemeStyleValue` の `fallback` フィールドは **CSS `var()` の第2引数**として使われている。スロット化後は **論理フォールバック**（テーマキー A → B → 既定）と **CSS フォールバック**を分けて考える（論理は 2、最終 CSS 文字列化は 4）。

### 3. Variant merge（種別・variant・状態の合成）

- **入力**: コンポーネント種別、variant 名、状態（hover / disabled 等）、ベースのスロット解決結果。
- **出力**: **マージ後のスロット→値**（まだ **出力形式に依存しない**中間表現が望ましい）。
- **やらないこと**: HTML/React の属性生成、プレビュー用のインライン style の最終形。

**根拠**: [`token-slot-model-and-theme-extension.md`](token-slot-model-and-theme-extension.md) が示す通り、スロット ID に全部載せるか **別レイヤで合成**するかは設計選択。本責務は **上書き順・優先度**を一箇所に閉じる。

### 4. Output formatter（出力先ごとの整形）

- **入力**: merge まで終えた **スロットまたは宣言の集合**（中間表現）。
- **出力**: 例 — **プレビュー用**のインライン style マップ、**HTML エクスポート**用の `style` 文字列または class、**React** 用の `style` オブジェクト／CSS 変数参照。
- **やらないこと**: テーマ YAML の読み込み、variant の意味解釈（それは 1–3）。

**既存対応の例**: `ThemeStyleResolver.resolveDeclaration` / `resolveRuleBlock` は **formatter に近い**が、現状は **単一ルールブロック → CSS テキスト**に特化。スロット対応後は **「formatter は複数バックエンドを持つ」**形が自然。

## データフローの推奨（概念）

```text
テーマ / descriptor（slot メタ）
  → [1 lookup] → [2 fallback] → [3 variant merge] → 中間表現
  → [4 output formatter] → プレビュー | HTML | React
```

**横断的関心事**（ログ、エラー方針、パフォーマンス）は各段の **外側**（オーケストレーション）に置く。

## 後続チケット（Vault）との対応

実装・ドキュメントの受け取り先として、次を **参照関係**として明示する。

| ID | 人間可読 ID | 主に関わる責務（本書上の番号） |
|----|-------------|--------------------------------|
| `T-20260322-201` | E4-S2-T1（descriptor slot メタ） | スロット ID の **入力**を descriptor に載せる（lookup/merge の入口） |
| `T-20260322-202` | E4-S2-T2（export formatter） | **4 output formatter**（HTML/React） |
| `T-20260322-203` | E4-S2-T3（preview inline） | **4 output formatter**（プレビュー経路の局所化） |

T201 が **スロットの「名前と入口」**を与え、T202/T203 が **4 を export / preview に分岐**する想定。T201–T203 は **1–3 の全部を一チケットで完結させる必要はない**（例: 最初のスライスでは merge を単純化し、後続で拡張）。

## スコープ外（本設計書の非目標）

- `ThemeStyleResolver` や `resolveDslTokens` の **具体的なクラス分割**とファイル移動手順。
- スロット ID の **正式命名規約の全文**（命名の拡張は [token-slot-naming-convention.md](token-slot-naming-convention.md) を正とする）。

## 関連ドキュメント

- [token-slot-model-and-theme-extension.md](token-slot-model-and-theme-extension.md) — Phase 6 のスロットモデルと resolver 責務の一覧
- [token-slot-naming-convention.md](token-slot-naming-convention.md) — スロット ID 命名
- [THEME_IMPLEMENTATION.md](THEME_IMPLEMENTATION.md) — UI テーマ切替（本書のスロット解決とは別系統の説明が中心）
