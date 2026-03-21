# ADR 0006: tokenStyleProperty と defaultTokenSlot の互換・段階移行

**日付**: 2026-03-22  
**チケット**: T-20260322-198（E4-S1-T1）  
**ステータス**: 採用

## コンテキスト

- **現行（2026-03 時点）**: 組み込みコンポーネントのテーマ適用は、descriptor 上 **`tokenStyleProperty`（CSS プロパティ名・kebab）1 本**で表現する。正本は `BUILT_IN_EXPORTER_RENDERER_DEFINITIONS`・`token-style-property-map`・エクスポート／WebView プレビューが同じ対応を参照する（[MAINTAINER_GUIDE.md](../MAINTAINER_GUIDE.md)）。
- **先行的な型**: `ComponentSpec` には **`defaultTokenSlot?: string`** が存在し、Phase 6 の **slot モデル**（[token-slot-model-and-theme-extension.md](../token-slot-model-and-theme-extension.md)）へ繋ぐための **フック**として置かれている。一方 **`ComponentDefinition` には未載せ**であり、ThemeStyleResolver 等の **ランタイム解決は未実装**（別チケット）とする。
- **T-178（完了）**: `COMPONENT_DEFINITIONS` の生成は `BUILT_IN_COMPONENT_SPECS`（`ComponentSpec`）から **単一経路**（`buildComponentDefinitionFromSpec`）に寄った。`tokenStyleProperty` は引き続き descriptor に投影され、`defaultTokenSlot` は **将来の slot 化のための宣言フィールド**として型に残る。

課題は、**二重の表現軸**（CSS プロパティ vs スロット ID）が混在したときの **互換ルール**・**非推奨のタイミング**・**移行の段階**を ADR で固定し、実装チケットの前提を揃えることである。

## 決定

### 1. 用語

| 用語 | 意味 |
|------|------|
| `tokenStyleProperty` | テーマ token を **1 つの CSS プロパティ**に適用するための **kebab 名**（例: `color`, `border-color`）。**現行の実行時正本**。 |
| `defaultTokenSlot` | コンポーネントの **既定のテーマスロット ID**（例: `Text.foreground`）。**slot 解決が実装された後**に resolver が参照する。**現時点では宣言のみ**可。 |

### 2. 互換レイヤ（優先順位）

**slot 解決が実装されるまで**（互換期間）:

- **描画・エクスポートの挙動**は **`tokenStyleProperty` のみ**を根拠とする（既存の `getTokenStylePropertyKebab` / `token-inline-style-from-definition` 等）。
- `defaultTokenSlot` が **値を持っていても、resolver が未接続ならビジュアル・出力には影響しない**（ドキュメント・将来実装のためのメタデータ）。

**slot 解決が有効になった後**（移行後）:

1. **`defaultTokenSlot` が指定されている**場合: **スロット経路を優先**し、resolver が **該当スロット → CSS プロパティ（複数可）** を解決する。
2. **`defaultTokenSlot` が未指定**の場合: **`tokenStyleProperty` を「既定スロットに相当する単一プロパティ適用」**として扱う（後方互換の核。既存 [token-slot-model](../token-slot-model-and-theme-extension.md) の「既定スロットへのマッピング」と同趣旨）。
3. **両方指定されている**移行期間: **矛盾を CI／lint で検知**する（同一 built-in でスロットと CSS プロパティの意味が食い違う場合はエラーまたは警告）。**検証ルールの具体化**は Epic4 の実装チケットで行う。

### 3. 段階移行

| フェーズ | 内容 |
|----------|------|
| **A（現行）** | `tokenStyleProperty` のみで運用。`defaultTokenSlot` は任意・未使用可。 |
| **B（slot 宣言）** | 設計ドキュメント・`ComponentSpec` に **スロット ID を追加**し、テーマファイルの拡張方針と合わせる（本 ADR は境界を固定）。 |
| **C（resolver 接続）** | ThemeStyleResolver（または同等）が **スロット → 値** を解決し、プレビュー／エクスポートが **slot 優先**になる。 |
| **D（単一化検討）** | `tokenStyleProperty` を **非推奨**にし、**スロットのみ**または **統合フィールド 1 本**へ寄せる（時期は Epic4 の完了条件とロードマップで決定。別 ADR で詳細化してよい）。 |

### 4. `ComponentSpec` 上の併用（非推奨の射程）

- コードコメントどおり **`tokenStyleProperty` と `defaultTokenSlot` の併用は移行期間のみ**とする。
- **T-178 完了後**も、`ComponentDefinition` に **`defaultTokenSlot` を投影する変更**は、resolver 実装と **同じリリース列**または **直前**にまとめることを推奨する（descriptor だけ先に増えても意味が読み取れない状態を避ける）。

### 5. 非推奨スケジュール（方針レベル）

- **具体的な日付**は本 ADR 採用時点では **未確定**（製品リリース・Epic4 のマイルストーンに紐付ける）。
- **確定したこと**: `tokenStyleProperty` の **完全削除**は、**slot 解決が全ビルトイン経路でデフォルト**になり、**テーマ DSL の互換テスト**が通るまで **行わない**。

## Vault（Obsidian）との相互参照

- **親エピック**: `T-20260322-173`（Epic4 テーマスロットアーキテクチャ）
- **本チケット**: `T-20260322-198` / `E4-S1-T1`

## 関連

- [token-slot-model-and-theme-extension.md](../token-slot-model-and-theme-extension.md)
- [token-slot-naming-convention.md](../token-slot-naming-convention.md)（スロット ID の命名・拡張時の衝突回避）
- [component-spec.ts](../../src/components/definitions/component-spec.ts)（`ComponentSpec`）
- [ADR 0004](0004-component-definition-graph-canonical.md) — descriptor グラフ正本
