# typed codec と `renderer/types` 層分割（設計メモ・Phase 2）

外部アーキ **Phase 2** の方向性メモ。**コードの分割 PR は含めない**（実装は別チケット）。

## 背景

- `component-map.tsx` や exporter dispatch は registry ベースだが、運用上 **`as unknown as X`** に依存しやすい。
- `decodeDslComponentObjectProps` 等は便利だが、戻り値が **`name` + 広い `Record`** に留まり、**コンポーネント種別と props の対応が TS 上で閉じにくい**。

## 1. typed codec（判別共用体）

**方向性**: DSL 上の 1 コンポーネントを、**判別可能な共用体**にデコードする。

```ts
// 例（API イメージ）。実装名は別チケットで確定。
type DecodedComponent =
  | { kind: 'Text'; props: TextComponent }
  | { kind: 'Button'; props: ButtonComponent }
  | ...;

function decodeComponent(raw: unknown): DecodedComponent;
function isComponentKind<T extends DecodedComponent['kind']>(
  decoded: DecodedComponent,
  kind: T
): boolean;
```

- **目的**: `kind` で絞り込んだあと `props` が **そのコンポーネントの型**に追従する（narrowing）。
- 既存の **registry／typed 判別**の取り組み（Vault: `Tasks/Archive` の **[[2026-03-21_型安全強化_typedレジストリと判別共用体]]（T-20260321-013）** は **done**）は、本メモの **codec 形状と層分割**の前提に位置づける。T-056 は **API とファイル境界の設計**にフォーカスする。

## 2. `renderer/types.ts` の層分割（最小単位）

現状は DSL 契約・プレビュー用 props・エクスポート入力が **ほぼ同居**している。まずは **ファイルを分け、型は `type` alias で再エクスポート**から始める。

| 案のファイル名 | 役割（例） |
|----------------|------------|
| `dsl-component-types.ts` | DSL／`ComponentDef` に近い **契約**（ドメイン側と整合） |
| `preview-component-props.ts` | WebView プレビュー用 props・表示都合の補助型 |
| `export-component-contract.ts` | Exporter が期待する入力・分岐に使う契約 |

- **最初は alias ベースで十分**（大規模な型の再定義は不要）。
- 分割後も **単一の re-export ファイル**（現行 `renderer/types.ts` を薄いファサードに残す）を許容し、呼び出し側の変更を段階的にする。

## 3. exporter dispatch（参考）

- `dispatchExporterRenderer` の exhaustive switch は有用だが、新 component のたびに基底クラス変更が重い。  
- **すぐ visitor にしなくても**、`rendererMethod → 型付き handler` の **registry 化**や **switch の局所化**で段階的に寄せる。

## 4. 完了条件（実装チケット側の目安）

- `component-map.tsx` の **unsafe cast が減る**こと。
- `BaseComponentRenderer` 側で **name / props の対応漏れをコンパイルで検知しやすく**なること。

## 関連ドキュメント

- [change-amplification-dsl.md](change-amplification-dsl.md) — DSL 変更の増幅箇所
- [registry-compat-layer-policy.md](registry-compat-layer-policy.md) — registry の参照経路
