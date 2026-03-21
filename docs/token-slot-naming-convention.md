# テーマ token slot の命名規約（E4-S1-T2）

**目的**: `defaultTokenSlot` や将来の ThemeStyleResolver が参照する **スロット ID** を、拡張時に衝突しにくく説明可能な形で揃える。[ADR 0006](adr/0006-token-style-property-and-default-token-slot-compatibility.md) の `defaultTokenSlot` 宣言と整合する。

## 構文（機械可読な最小ルール）

1. **区切り**: セグメントは **ASCII の `.`（ドット）** のみで連結する。スペース・`/`-`_` による階層表現は **採用しない**（既存の概念的例をコードに落とすときの正）。
2. **許可文字**: 各セグメントは **`[a-z][a-z0-9]*`**（先頭小文字、続きは小文字または数字）。**PascalCase / camelCase の混在**はスロット ID では使わない（コンポーネント種別名は次節の語彙で表す）。
3. **長さ**: 実用的な上限の目安は **セグメント 4 個以内**（例: `button.primary.background`）。それ以上は **別スロットに分割**するか、テーマ側の **ネスト**で表現する（[token-slot-model-and-theme-extension.md](token-slot-model-and-theme-extension.md)）。

## セマンティクス（左から右へ一般 → 具体）

推奨の読み方:

| 位置 | 意味（例） | 例 |
|------|------------|-----|
| 1 段目 | **ドメイン**（何の見た目か） | `text`, `button`, `container`, `border` |
| 2 段目以降 | **バリアント・ロール・状態**（必要なら） | `primary`, `foreground`, `background`, `hover` |

**例（正）**

- `text.color` — テキスト既定の前景色（[token-slot-model](token-slot-model-and-theme-extension.md) の例と一致）
- `container.background` — コンテナ背景
- `button.primary.background` — プライマリボタンの背景

**例（避ける）**

- `Text.primaryColor` — セグメントに大文字を含む（ルール 2 違反）
- `text_color` — ドット区切りでない
- `text` — 単一セグメントのみは **汎用すぎる**ため、新規追加では **ドメイン + ロール** まで付ける（既存互換で短い ID が残る場合は ADR / 移行表で明示する）

## 拡張時の衝突を避ける（レビュー観点）

1. **新しいスロットは「より具体的な左」から追加**する。  
   例: `button` 用に `accent` を足すなら、既存の `button.primary.background` と並ぶ **`button.accent.background`** のように **同じ階層構造**を踏襲する。

2. **同義の別名を増やさない**（`text.fg` と `text.color` の併存など）。やむを得ない場合は **ADR に「どちらを正とし、いつ廃止するか」** を書く。

3. **コンポーネント種別・バリアント名**は、可能なら **DSL 上の built-in 名（`Text`, `Button` …）の小文字化**に合わせる（`text`, `button`）。カスタム種別が増える場合は **`custom.<name>.…`** のような **プレフィックス**でビルトインと名前空間を分ける。

4. **状態（hover / disabled）**は、スロット ID に含めるか **variant merge** の別レイヤにするかは [token-slot-model](token-slot-model-and-theme-extension.md) の resolver 設計に従う。ID に含める場合は **最後のセグメント**に寄せる（例: `button.primary.background.hover` は **5 セグメント** — 長くなるなら `button.primary.background` + 状態別テーブルへ分離を検討）。

## 既存ドキュメントとの関係

- **概念・Phase 6**: [token-slot-model-and-theme-extension.md](token-slot-model-and-theme-extension.md)
- **`tokenStyleProperty` / `defaultTokenSlot` の互換**: [ADR 0006](adr/0006-token-style-property-and-default-token-slot-compatibility.md)

## 変更履歴

- 2026-03-22: 初版（E4-S1-T2 / T-199）
