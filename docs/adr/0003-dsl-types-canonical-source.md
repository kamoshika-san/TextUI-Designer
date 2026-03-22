# ADR 0003: DSL 型の正本（`domain/dsl-types`）と `renderer/types` の役割

## ステータス

**採用** — T-073（棚卸し・ポリシー文書化）で固定。以降の import 移行（T-074 等）は本 ADR に従う。

## コンテキスト

- `src/domain/dsl-types.ts` と `src/renderer/types.ts` が **同一の DSL 概念**（例: `TextUIDSL`, `ComponentDef`）について **並行した型定義**を持っている。
- `CacheManager` / `DiffManager` / `TextUICoreEngine` / 各 exporter などが **`renderer/types` を直接参照**しており、**「レンダラ専用」と「拡張ホスト全体の契約」の境界が曖昧**になる。
- WebView（React）側は従来どおり `src/renderer/*` に寄せやすいが、**共有 DSL の意味論**は拡張機能・CLI・core・exporter で一貫させる必要がある。

## 決定

1. **共有 DSL 型の正本は `src/domain/dsl-types.ts`** とする（`TextUIDSL` / `ComponentDef` およびそれに紐づく構造）。
2. **移行期**においては `src/renderer/types.ts` を **`domain/dsl-types` への re-export または thin alias に収束**させる方向で整理する（一括変更は行わず、チケット単位のスライス）。
3. **新規コード**では、拡張ホスト・CLI・core・exporter から **可能な限り `domain/dsl-types` を参照**する。WebView 専用の見た目・プレビュー限定の型は `renderer` 側に残してよい。
4. **棚卸し一覧**は [dsl-types-renderer-types-inventory.md](../dsl-types-renderer-types-inventory.md) を正とする。

## `renderer/types.ts` の最終役割（T-SSOTC-10）

- `src/renderer/types.ts` は **互換窓口（thin facade）** としてのみ維持する。
- 共有 DSL 型の定義元は `src/domain/dsl-types.ts` に固定し、`renderer/types` は再エクスポート責務に限定する。
- `src/renderer/**` 外から `renderer/types` を新規 import しない（既存ガードでゼロ維持）。

### 互換期間中の禁止事項

- `renderer/types` へ **型本体・独自 alias・業務ロジック** を追加しない。
- `renderer/types` を shared DSL 型の正本として参照しない。

### 将来削除の判定条件

以下をすべて満たした場合、`src/renderer/types.ts` の削除を検討する。

1. `src/renderer/**` を含め、`renderer/types` への参照がゼロである。
2. `domain/dsl-types` 直参照で WebView / preview / exporter のビルドとテストが通る。
3. 外部公開契約（拡張利用者向け互換面）への影響なし、または移行手順を文書化済み。

## 運用ルール（型追加フロー）

1. 共有 DSL 型の追加・変更は **最初に `src/domain/dsl-types.ts`** を更新する。
2. `src/renderer/types.ts` は **互換レイヤ（thin facade）** とし、型本体・独自 alias を追加しない。
3. `src/renderer/**` 外で `renderer/types` を新規 import しない（必要時は ADR 追記で例外を明文化）。
4. 変更時は最低限、以下のガードを実行してから PR を作成する。
   - `npx mocha --grep "renderer/types|SSoT eslint restriction scope guard" tests/unit`
   - `npx eslint "src/core/**/*.{ts,tsx}" "src/exporters/**/*.{ts,tsx}" "src/cli/**/*.{ts,tsx}" "src/utils/**/*.{ts,tsx}" "tests/**/*.{js,ts,tsx}"`

## 結果

- 型の「どれが正か」がドキュメントとコードの両方で追える。
- T-074 以降の import 移行は **小さなスライス**で行い、回帰を `npm test` 等で担保する。
- 2026-03-21 Sprint4（T-128〜T-130）で、`src/renderer/types.ts` は **thin facade**（domain 再エクスポート）に収束し、`src/renderer/**` 外からの `renderer/types` import は **ゼロ**を CI ガードで強制する運用に更新した。

## 補遺: T-166 / T-167 を入力とした推奨コース（T-168・2026-03-22）

### 入力の要約

- **T-166（棚卸し）**: [dsl-types-renderer-types-inventory.md](../dsl-types-renderer-types-inventory.md) および `npm run check:dsl-types-ssot` により、**非 `src/renderer/**` からの `renderer/types` import は 0 件**を維持。`src/renderer/types.ts` は **`domain/dsl-types` の再エクスポートのみ**（thin facade）に収束済み。
- **T-167（PoC）**: [ssot-webview-dsl-types-direct-import-poc.md](../ssot-webview-dsl-types-direct-import-poc.md) により、**WebView 入口**（例: `webview.tsx`）で **`domain/dsl-types` を直接 import** しても、ビルド・型・既存テストと整合する。**ESLint / import 境界**上、当該パスは `renderer/types` 経由に限定されない。

### 推奨コース（維持 / 縮退 / 削除準備）

| コース | 意味（本リポジトリでの解釈） | いつ見直すか |
|--------|------------------------------|--------------|
| **維持（当面）** | `src/renderer/types.ts` を **thin facade** として残す。共有 DSL の意味論の正本は引き続き **`src/domain/dsl-types.ts`**。 | インベントリの集計が大きく変わる・または下記「削除準備」の条件が揃いそうなとき。 |
| **縮退** | facade に **型本体・独自 alias・業務ロジックを足さない**（上記「互換期間中の禁止事項」と同義）。WebView 側は必要に応じて **domain 直参照**（T-167）と facade 併存しうるが、**新規の「正本の二重化」は避ける**。 | 新規コンポーネント・新規 exporter 経路を追加するとき。 |
| **削除準備** | ファイル削除そのものは **行わない**（非スコープ）。上記「**将来削除の判定条件**」を **すべて満たした**うえで、**別チケット**で削除・移行手順・外部契約を扱う。 | PM/TM が「互換レイヤ撤去」をバックログに載せるタイミング。 |

### PM/TM 向け完了判断メモ

- **本補遺の時点**では **「維持 + 縮退ルールの厳守」**を推奨コースとする。**合意なしの削除 PR は行わない**（親エピックの方針と一致）。
- 次エピックでは、**`renderer/types` 参照ゼロ（`src/renderer/**` 含む）**に近づけるスライスか、**プレビュー専用型の分離**（`preview-types.ts` 等）を [ssot-renderer-types-inventory.md](../ssot-renderer-types-inventory.md) の観察に沿って検討してよい。

## 関連

- 棚卸し: [dsl-types-renderer-types-inventory.md](../dsl-types-renderer-types-inventory.md)
- WebView / renderer 別インベントリ: [ssot-renderer-types-inventory.md](../ssot-renderer-types-inventory.md)
- メンテナー導線: [MAINTAINER_GUIDE.md](../MAINTAINER_GUIDE.md)「互換レイヤ（`renderer/types.ts`）」
- 型追加の実務手順: [adding-built-in-component.md](../adding-built-in-component.md)
- PR 入力テンプレ: [../../.github/PULL_REQUEST_TEMPLATE.md](../../.github/PULL_REQUEST_TEMPLATE.md)
- 親エピック: T-20260321-072（保守性 Top リスク追跡）
