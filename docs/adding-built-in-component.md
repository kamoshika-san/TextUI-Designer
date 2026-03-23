# ビルトインコンポーネント追加の修正箇所（チェックリスト）

新しい **組み込みコンポーネント** を追加するときに触る主なファイル・手順の入口。**5 要素を 1 セットとする契約**は [component-add-contract.md](component-add-contract.md)（T-055）。ここは **迷わず一覧**できることを目的とする。

## Obsidian / PM 用チケットテンプレ（Vault）

**TextUI-Designer-Doc** Vault を使う場合は、`Tasks/Template/新built-in追加チケット-template.md` を複製して起票する（**spec / preview / export（または明示 unsupported）/ sample / tests** をチェックリストに固定。T-187）。索引は Vault 内 `Tasks/Template/README.md`。

**マージ時点での exporter 必須範囲・unsupported コメントの意味**は [adr/0005-exporter-unsupported-and-phased-rollout.md](adr/0005-exporter-unsupported-and-phased-rollout.md)（T-188 / ADR 0005）。チケットテンプレ（T-187）と同じ前提（段階実装はブランチ内、`BUILT_IN_COMPONENTS` 掲載時は契約完走）で読む。

## 前提

- 型・descriptor・スキーマ・プレビュー・エクスポートの **いずれかだけ更新すると** 実行時・CI・補完で不整合になる。
- より詳しい **change amplification** の説明は [change-amplification-dsl.md](change-amplification-dsl.md) を参照。
- SSoT の正本と互換レイヤ方針は [adr/0003-dsl-types-canonical-source.md](adr/0003-dsl-types-canonical-source.md) を参照。
- このページは **実務手順の正本**。設計判断の根拠は ADR（`adr/0003`）を参照する。
- **descriptor の中心は ComponentSpec 経路**である。`BUILT_IN_COMPONENT_SPECS`（`component-definitions.ts`）から `COMPONENT_DEFINITIONS` を生成し、補完・スキーマ oneOf・契約テストはここを基準に揃える。スキーマ JSON の更新経路は [schema-pipeline-from-spec.md](schema-pipeline-from-spec.md)、補完メタの執筆場所は [completion-descriptor-authoring.md](completion-descriptor-authoring.md)。

---

## 固定順序（SSoT・必須 4 フェーズ）

**順序を飛ばすと** import 境界違反・スキーマ不一致・CI 失敗に直結する。次の **4 フェーズ**を上から順に実施する。

| フェーズ | 内容 | 代表パス |
|----------|------|----------|
| **1. domain** | 名前の正本 → 共有 DSL 型の正本 | `built-in-components.ts` → `domain/dsl-types.ts` |
| **2. schema / descriptor（ComponentSpec 中心）** | `ComponentSpec` 合成 → `COMPONENT_DEFINITIONS` → `npm run compile` で `schemas/` 再生成 | `component-spec.ts`, `component-definitions.ts`, `manifest.ts`（補完文面）, `exporter-renderer-definitions.ts` |
| **3. facade 維持** | `renderer/types` は **thin facade のみ**（型本体を足さない） | `src/renderer/types.ts` |
| **4. guard 実行** | SSoT 境界チェック → コンパイル → テスト | `npm run check:dsl-types-ssot` ほか |

**補足（フェーズ 1 の「名前 → 型」）**: `DSL_COMPONENT_KINDS` は `BUILT_IN_COMPONENTS` から導出される（T-091）。そのため **新しい kind 文字列**は **`src/components/definitions/built-in-components.ts` に先に追加**し、続けて **`src/domain/dsl-types.ts`** で `ComponentDef` の union・型ガードを拡張する（`dsl-types` が `BUILT_IN_COMPONENTS` を import するため）。

---

## DSL 型追加の最短フロー（上記 4 フェーズに対応）

1. **domain**: `built-in-components.ts`（名前）→ `dsl-types.ts`（型・union・型ガード）。
2. **schema / descriptor**: `types.ts`（型）→ `exporter-renderer-definitions.ts` → **`manifest.ts`（補完用 description/properties）** → `component-definitions.ts` が `BUILT_IN_COMPONENT_SPECS` / `COMPONENT_DEFINITIONS` を合成。**手で `schemas/schema.json` の oneOf を編集しない**（`compile` で [schema-pipeline-from-spec.md](schema-pipeline-from-spec.md) のとおり再生成）。
3. **facade**: `src/renderer/types.ts` は thin facade を維持し、**型本体を追加しない**。
4. **非 renderer** で `renderer/types` import を増やさない（[ADR 0003](adr/0003-dsl-types-canonical-source.md)）。
5. **guard**: 変更後に必ず次を実行する:
   - `npm run compile`
   - `npm run check:dsl-types-ssot`
   - `npm test`（または少なくとも `npm run test:unit`）

---

### 型追加テンプレ（PR 説明にコピペ）

新規型追加・共有 DSL 型変更の PR では、以下を **説明欄にそのまま貼り**、チェックを付ける。

#### チェックリスト

- [ ] **フェーズ 1 domain**: `built-in-components.ts`（新 kind 名）→ `dsl-types.ts` を **この順で**更新した
- [ ] **フェーズ 2 schema/descriptor**: `definitions` / schema 生成物が `COMPONENT_DEFINITIONS` と整合している
- [ ] **フェーズ 3 facade**: `src/renderer/types.ts` に型本体を追加していない（thin facade 維持）
- [ ] `src/renderer/**` 外で `renderer/types` の **新規 import を増やしていない**
- [ ] **フェーズ 4 guard**: `npm run compile` → `npm run check:dsl-types-ssot` → `npm test` を実行した（結果を PR に記載）
- [ ] HTML exporter を触る場合: **Primary**（`useReactRender !== false`）を先に確認し、fallback は互換レーンとして必要時のみ別理由で扱った

## HTML exporter の Primary check

新しい built-in が HTML 出力に触れる場合、完了条件はまず **Primary path** を満たすこと。ここでいう Primary は `useReactRender !== false` の既定経路で、`react-static-export` と共有 WebView renderer を通る。

Fallback（`useReactRender === false`）は capture / 互換維持のための明示レーンであり、新しい built-in 対応の完了条件そのものではない。差分の棚卸しや既定値契約は [exporter-boundary-guide.md](exporter-boundary-guide.md) と [html-exporter-primary-fallback-inventory.md](html-exporter-primary-fallback-inventory.md) を先に確認する。

#### PR 記載例（本文テンプレ）

次のブロックをそのまま使ってよい（チケット番号・要約だけ差し替え）。

```markdown
## 変更概要
- （例）ビルトイン `Foo` 追加に伴う共有 DSL 型・定義の更新

## SSoT 4 フェーズ対応
- domain: `built-in-components.ts` → `domain/dsl-types.ts`
- schema/descriptor: `definitions/*`・スキーマ生成
- facade: `renderer/types.ts` は re-export のみ（型本体なし）
- guard: 下記コマンドを通過

## 検証
\`\`\`bash
npm run compile
npm run check:dsl-types-ssot
npm test
\`\`\`
（ログに失敗が無いこと）
```

---

### トラブルシュート（失敗時の見る場所）

| 症状 | まず確認すること | 参照 |
|------|------------------|------|
| `check:dsl-types-ssot` が **import 違反**を出す | `src/renderer/**` 外で `renderer/types` を新規 import していないか。共有型は `domain/dsl-types` に寄せる | [MAINTAINER_GUIDE.md](MAINTAINER_GUIDE.md#ssot-import-boundary-失敗時の調査観点) |
| `dsl-types-descriptor-sync` 等が落ちる | domain と `definitions` の kind 名・descriptor の不一致 | 本ページのチェックリスト **フェーズ 1〜2** |
| `compile` は通るが **プレビューだけ壊れる** | `component-map.tsx`・`renderer/components/*` の登録漏れ | [component-add-contract.md](component-add-contract.md) |
| スキーマと YAML の補完がズレる | `COMPONENT_DEFINITIONS` と `schemas/` の oneOf / `schemaRef` | `npm run compile` 後の生成物を確認 |
| `component-contract-consistency` が落ちる | `built-in` / manifest / descriptor / exporter の **どのキーが欠けているか**をメッセージ内のファイルパスで確認 | [ADR 0005](adr/0005-exporter-unsupported-and-phased-rollout.md)、`tests/unit/component-contract-consistency.test.js` |

**一般手順**: [MAINTAINER_GUIDE.md](MAINTAINER_GUIDE.md) の「SSoT import-boundary 失敗時の調査観点」に従い、**フェーズ 4 を再実行**してからログのファイルパスを上から直す。

---

## チェックリスト（ファイル別・推奨順）

以下は **フェーズ 1→2→…** に沿った **作業順**。上の 4 フェーズを崩さないこと。**旧「多点をバラバラに触る」フローではなく**、まず **名前・型・Exporter 定義・補完文面（manifest）** を揃えてから **`component-definitions.ts` が一括で descriptor 行を出す**想定で読む。

1. **`src/components/definitions/built-in-components.ts`**
   - `BUILT_IN_COMPONENTS` にコンポーネント名を追加（**DSL kind 名の正本**）。
2. **`src/domain/dsl-types.ts`**
   - `ComponentDef` の union および `*Component` 型・型ガードを追加（**共有 DSL 型の正本**）。
3. **`src/components/definitions/types.ts`**
   - コンポーネント定義用の型（プロパティ・descriptor 用）を追加。
4. **`src/components/definitions/exporter-renderer-definitions.ts`**
   - `previewRendererKey` / `exporterRendererMethod` などのレンダラ定義を追加。
5. **`src/components/definitions/manifest.ts`**
   - 補完・説明文（`description` / `properties`）を追加（**執筆正本** → `BUILT_IN_COMPONENT_SPECS` に取り込まれる。詳細は [completion-descriptor-authoring.md](completion-descriptor-authoring.md)）。
6. **`src/components/definitions/component-definitions.ts`**
   - 通常は **手で行を増やさず**、`BUILT_IN_COMPONENTS` と上記の合成により `BUILT_IN_COMPONENT_SPECS` → `COMPONENT_DEFINITIONS` が更新されることを確認する。
7. **スキーマ**
   - `schemas/` 配下の生成物は `npm run compile` 時に更新される（`scripts/generate-schemas-from-definitions.cjs`）。`COMPONENT_DEFINITIONS` の `schemaRef` と `definitions.component.oneOf` が一致すること（[schema-pipeline-from-spec.md](schema-pipeline-from-spec.md)）。
8. **`src/renderer/types.ts`**
   - **thin facade のみ**（必要なら `domain/dsl-types` からの re-export）。型本体をここに増やさない。
9. **WebView プレビュー**
   - `src/renderer/component-map.tsx` にレンダラを登録。
   - 必要に応じて `src/renderer/components/` に TSX を追加。
10. **トークン由来のスタイル**
   - `tokenStyleProperty` を使う場合は `src/components/definitions/token-style-property-map.ts` と `src/renderer/token-inline-style-from-definition.ts` の整合を確認。
11. **エクスポート**
    - `src/exporters/` 側の該当メソッド（`base-component-renderer` 等）に分岐を追加。
    - HTML exporter を触る場合は **Primary（`useReactRender !== false`）を先に確認**し、fallback は capture / 互換レーンとして別扱いにする。
12. **検証（フェーズ 4）**
    - `npm run compile` → `npm run check:dsl-types-ssot` → `npm test`（必要なら `npm run test:all`）。
    - 機械系: `tests/unit/dsl-types-descriptor-sync.test.js`、`component-definitions` 系の不変条件テストが通ること。

---

## 関連ドキュメント

- [schema-pipeline-from-spec.md](schema-pipeline-from-spec.md) — `schema.json` の oneOf / definitions と descriptor の対応（**手編集禁止の理由**）
- [completion-descriptor-authoring.md](completion-descriptor-authoring.md) — 補完を変えるときの編集箇所（manifest → descriptor）
- [new-built-in-sample-regression-stub.md](new-built-in-sample-regression-stub.md) — **sample + 回帰テスト**のコピー用雛形（`sample/09-new-built-in-stub/`）
- [adr/0005-exporter-unsupported-and-phased-rollout.md](adr/0005-exporter-unsupported-and-phased-rollout.md) — exporter 必須範囲・段階導入・unsupported 出力の製品方針（T-188）
- [component-add-contract.md](component-add-contract.md) — 追加時の契約（descriptor / schema / preview / exporter / tests の 1 セット）
- [change-amplification-dsl.md](change-amplification-dsl.md) — DSL の増幅箇所とテストの説明
- [registry-compat-layer-policy.md](registry-compat-layer-policy.md) — registry 互換レイヤの運用（新規は正本へ）
- [adr/0003-dsl-types-canonical-source.md](adr/0003-dsl-types-canonical-source.md) — `domain/dsl-types` 正本化と `renderer/types` thin facade 方針
- [../.github/PULL_REQUEST_TEMPLATE.md](../.github/PULL_REQUEST_TEMPLATE.md) — PR 時の SSoT 影響チェック
