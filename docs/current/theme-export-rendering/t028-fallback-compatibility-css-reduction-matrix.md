# T-028: fallback compatibility CSS 削減マトリクス

**正本**: `buildFallbackCompatibilityStyleBlock` → 実体は `src/exporters/html-template-builder.ts` の **`getFallbackCompatibilityStyleBlock`**。  
**スコープ**: 本ドキュメントは **ルールの列挙・分類・削除順・削除候補**まで。**実 CSS の削除は別 PR／別チケット**（本マトリクスは計画のみ）。

## 分類の凡例

| 分類 | 意味 |
|------|------|
| **Keep (Temporary)** | 現行の fallback 静的 HTML または互換テストがまだ依存。Primary の `webviewCss` だけでは吸収できない。 |
| **Absorbable** | Primary 側の WebView 既定 CSS またはコンポーネント側クラスと重複・近接しており、`webviewCss` 強化や Primary 契約テスト拡充後に縮小候補。 |
| **Delete candidate** | 重複・デッドパスが明確で、承認後にブロックを外して削除してよい候補（実削除は別作業）。 |

## ルール家族マトリクス

| 家族（セレクタのまとまり） | 主なセレクタ例 | 現状の役割 | 分類 | 削除順（小さいほど先） | メモ |
|----------------------------|----------------|------------|------|------------------------|------|
| Badge ベース | `.textui-badge` | 静的 HTML で badge 系のレイアウト底上げ | Keep (Temporary) | 50 | fallback レーン専用。Primary は React 経路。 |
| Badge サイズ | `.textui-badge-sm` / `.textui-badge-md` | サイズ別トークン | Absorbable | 40 | WebView の badge トークンと照合し、重複なら後段で統合。 |
| Badge バリアント | `.textui-badge-default` 等 | 色面の互換 | Keep (Temporary) | 45 | export 互換スタイルの中核。 |
| Divider | `.textui-divider` / `.vertical` | レガシー文字列レンダラの divider 見た目 | Absorbable | 35 | `Divider.tsx` + 既定 CSS と差分比較後に縮小。 |
| Tabs コンテナ・タブボタン | `.textui-tabs` ～ `.textui-tabs .flex > button.textui-tab-active` | レガシー Tabs の flex 行・ active 色 | Keep (Temporary) | 30 | Primary は DOM クラス構成が異なる（`textui-tab is-active`）。当面は fallback 契約が残る。 |
| Progress 骨格 | `.textui-progress` ～ `.textui-progress-fill` | プログレスバー互換 | Keep (Temporary) | 25 | fallback スタイルレーンでピン留め。 |
| Progress バリアント色 | `.textui-progress-default` ～ `.textui-progress-error` | fill の色バリアント | Absorbable | 20 | `.textui-progress-fill` の既定色と **`.textui-progress-default` の重複**が大きい。統合時は default を先に検討。 |
| Button ベース・バリアント | `.textui-button` / `.primary` / `.secondary` 等 | ボタン互換 | Keep (Temporary) | 15 | レガシー Button と整合。 |
| Button submit | `.textui-button.submit` | submit 時の見た目 | **Delete candidate** | **10** | **`.textui-button.primary` と宣言が同一**（背景・文字色・枠）。submit 専用ルールは冗長のため、Primary/WebView 側で `submit` を `primary` に寄せたうえで **先に削除候補**とする。 |
| Button disabled | `.textui-button:disabled` / `.disabled` | 無効化スタイル | Keep (Temporary) | 12 | submit 削除後も disabled は残す。 |

## 削除順序（要約）

1. **Delete candidate の解消** — `.textui-button.submit` を `.textui-button.primary` へ寄せる設計合意のもと **重複セレクタのみ削除**（テスト・スナップショットの更新を含む）。  
2. **Progress default の整理** — `.textui-progress-default` と `.textui-progress-fill` 既定色の重複解消（Absorbable）。  
3. **Divider / Badge サイズ** — WebView CSS との差分表を取り、重複ルールを段階削除。  
4. **Tabs ブロック** — Primary 契約と fallback 契約の差分縮小（T-023 系）が進んだあと、セレクタ単位で削減可否を再判定。

## 削除候補（≥1 本チケット要件）

| 候補 | 理由 | 実削除時の前提 |
|------|------|----------------|
| **`.textui-button.submit` ブロック** | `.textui-button.primary` と同一宣言であり、fallback 専用互換 CSS のみが benefit。 | レンダラが `submit` でも `primary` と同じクラスグラフになる、または WebView 側で submit をカバーすることを確認したうえで削除。 |

## 関連

- [export-fallback-lane-boundary-policy.md](./export-fallback-lane-boundary-policy.md)  
- [t021-fallback-removal-criteria.md](./t021-fallback-removal-criteria.md)  
