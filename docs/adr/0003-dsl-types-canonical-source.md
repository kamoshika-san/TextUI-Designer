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

## 関連

- 棚卸し: [dsl-types-renderer-types-inventory.md](../dsl-types-renderer-types-inventory.md)
- メンテナー導線: [MAINTAINER_GUIDE.md](../MAINTAINER_GUIDE.md)「境界ガイド索引」
- 型追加の実務手順: [adding-built-in-component.md](../adding-built-in-component.md)
- PR 入力テンプレ: [../../.github/PULL_REQUEST_TEMPLATE.md](../../.github/PULL_REQUEST_TEMPLATE.md)
- 親エピック: T-20260321-072（保守性 Top リスク追跡）
