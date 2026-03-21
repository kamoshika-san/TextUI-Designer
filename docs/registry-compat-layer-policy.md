# registry 互換レイヤの運用（import 禁止・削除条件）

この文書は、`src/registry/component-manifest.ts` など **後方互換のための re-export 集約**が長期残留して「新旧二重世界」になるのを防ぐためのルールです。  
外部向けの「公開API / 設定 / exporter」契約は別紙 [api-compat-policy.md](api-compat-policy.md) を参照してください。

## 1. 対象となる「互換レイヤ」モジュール

| モジュール | 役割 |
|-----------|------|
| `src/registry/component-manifest.ts` | `BUILT_IN_COMPONENTS` / `COMPONENT_MANIFEST` / `getComponentSchemaRefs` 等を **正本モジュールから再エクスポート**する互換入口。ファイル先頭コメントのとおり **compatibility のみ**。 |
| `src/registry/component-registry.ts` | `getComponentName` / `getComponentProps` 等の **ユーティリティ**と、`component-manifest` 由来シンボルの再エクスポートを同居。`BUILT_IN_COMPONENTS` 等を **互換経由で取る import** は本ポリシーの「互換 import」に含める。 |

**正本（新規コードが参照すべき先）の例**

- 組み込みコンポーネント名・配列: `src/components/definitions/built-in-components.ts`
- descriptor / 定義: `src/components/definitions/component-definitions.ts`（`COMPONENT_DEFINITIONS`）
- JSON Schema の component 列挙: `src/services/schema/schema-descriptor-selectors.ts`
- VS Code 補完カタログ: `src/services/completion-component-catalog.ts`

## 2. 新規禁止ルール（互換 import の増殖禁止）

- **新規コード**で、上記互換レイヤから **`BUILT_IN_COMPONENTS` / `COMPONENT_MANIFEST` / `getComponentSchemaRefs`（manifest 経由）** 等を直接 import してはならない。  
  必要なら **正本モジュール**へ直接 import する。
- **例外**: 既存ファイルの移行が未完了の箇所は、本リポジトリでは **許可リスト**（下記「棚卸し」）に載っているファイルに限り、当面 `component-manifest` / `component-registry` からの import を許容する。  
  **新規ファイルをこの例外に追加しないこと**（追加する場合は PR で理由と移行期限を明記し、許可リスト更新をレビューで合意する）。

## 3. 削除条件（互換レイヤを薄くする／消す）

次をすべて満たしたとき、該当の **互換 import を削除**し、正本のみに寄せる。

1. **利用箇所ゼロ**: `src/` 内で、当該シンボルを互換レイヤから import しているファイルがなくなる（`src/registry/` 内部の再エクスポートは別途判断）。
2. **代替経路の確認**: 同じ挙動が、descriptor / schema / 補完の **正本パイプライン**でカバーされていることをテストまたはレビューで確認する。
3. **回帰**: `npm test`（少なくとも unit）が通る。

`component-manifest.ts` ファイル自体を削除するかどうかは、外部拡張や `out/` を介した参照の有無を確認したうえで別チケットとする（本チケットのスコープ外でもよい）。

## 4. 棚卸し（2026-03-21 時点・`src/`）

`component-manifest` への **import**（コメント内の言及は除く）:

| ファイル | 備考 |
|---------|------|
| `src/registry/component-registry.ts` | 互換レイヤ内部 |
| `src/cli/validator/component-walker.ts` | `BUILT_IN_COMPONENTS` — 将来は `built-in-components` 直参照へ寄せる候補 |

`component-registry` への import（**`webview-component-registry` は別物**）:

| ファイル | 備考 |
|---------|------|
| `src/cli/component-traversal.ts` | `BUILT_IN_COMPONENTS` — 将来は `built-in-components` 直参照へ寄せる候補 |

テスト・`out/` 配下の require は本ポリシーの「新規侵入ガード」対象外（別テストで担保可能）。

## 5. 自動検知（CI / ローカル）

- **ユニットテスト**: `tests/unit/registry-compat-import-guard.test.js`  
  `src/` 内で、許可リスト外のファイルが `component-manifest` / `component-registry`（webview 以外）を import した場合に失敗する。

## 6. 参照

- `src/registry/component-manifest.ts`（ファイル先頭コメント）
- [MAINTAINER_GUIDE.md](MAINTAINER_GUIDE.md)（クイックスタート表の registry 行）
- 親チケット: `Tasks/2026-03-21_コードレビュー_保守性リスク_エピック.md`
