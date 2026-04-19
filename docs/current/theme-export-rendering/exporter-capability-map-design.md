# Exporter capability map 設計案（E2-S2-T2）

**ステータス**: 提案（実装は別チケット）  
**日付**: 2026-03-22  
**関連チケット**: `T-20260322-191`

## 1. 問題意識（現状）

`BaseComponentRenderer`（`src/exporters/base-component-renderer.ts`）は次の二層を併せ持つ。

1. **ランタイムディスパッチ**: `EXPORTER_RENDERER_DISPATCH` が `ExporterRendererMethod` から `renderXxx(props, key)` へ型付きで接続する。
2. **サブクラス契約**: 各 `HtmlExporter` / `PugExporter` / `ReactExporter` 等は **`protected abstract renderXxx` を built-in 種類ぶんすべて実装**する必要がある。

`BUILT_IN_EXPORTER_RENDERER_DEFINITIONS`（`exporter-renderer-definitions.ts`）で **kind → `rendererMethod`** は既に表形式で持てている一方、**新しい built-in を1つ足すたびに** 各 exporter ファイルへ **同名メソッドの実装を機械的に追加**するコストが残る。これが本設計案の主たる「追加コスト」である。

## 2. 目標

- **必須抽象メソッド列**（`renderText` … `renderIcon`）への依存を弱め、**kind（または `ExporterRendererMethod`）→ ハンドラ**の **capability map** を exporter の拡張点の正に近づける。
- **型安全**と **Primary / Fallback**（[exporter-boundary-guide.md](./exporter-boundary-guide.md)）の整理可能性を損なわない範囲で段階移行する。

## 3. 推奨アーキテクチャ（案）

### 3.1 データモデル

| 概念 | 説明 |
|------|------|
| **Capability key** | 現状どおり `BuiltInComponentName` または `ExporterRendererMethod` と **1:1 で対応**させる（`BUILT_IN_EXPORTER_RENDERER_DEFINITIONS` と整合）。 |
| **Handler** | シグネチャは概ね `(props: 当該コンポーネント型, key: number) => string`。map に格納する際は **ディスパッチ層で既存どおり `unknown` → 型アサーション**するか、**ジェネリック付きファクトリ**で閉じる。 |
| **Registry 単位** | **1 exporter インスタンスあたり 1 本の `ReadonlyMap`**（またはオブジェクトリテラル）を「その形式が出力できる built-in の集合」とみなす。 |

### 3.2 `BaseComponentRenderer` の役割変更（最終形のイメージ）

- **抽象メソッドを廃止**し、代わりに  
  `protected abstract buildExporterCapabilities(): ReadonlyMap<ExporterRendererMethod, …>`  
  のような **構築フック**だけを要求する、**または**
- **デフォルト実装**を `BaseComponentRenderer` が提供し、サブクラスは **差分だけ** map で上書き（オプショナルな partial map）。

`dispatchExporterRenderer` は既存の静的テーブルを **インスタンスの capability map に読み替える**形が自然である（`initializeHandlers` との接続はそのまま）。

### 3.3 未実装・未対応の扱い

- map に **エントリが無い kind** は、現状の `renderUnsupportedComponent` または **共通のプレースホルダ**へ落とすポリシーを明示する（形式ごとに異なってよいが、**文書化**する）。
- **Primary（React 静的）** と **Fallback（文字列 `BaseComponentRenderer`）** で map の中身を共有するか分離するかは [exporter-boundary-guide.md](./exporter-boundary-guide.md) の「正」を維持するため、**別インスタンス／別 map** を推奨（混在バグの温床を避ける）。

## 4. 移行段階（案）

| 段階 | 内容 | 完了の目安 |
|------|------|------------|
| **0** | 本ドキュメントで合意（レビュー済み） | チケット `review` → `done` |
| **1** | `ExporterRendererMethod` 全件をカバーする **テスト／型ガード**（欠けがあれば CI 失敗）を追加し、現状の abstract 実装と **一覧の単一性**を固定 | リグレッション防止 |
| **2** | **1 形式**（例: `react-exporter` または fallback 専用クラス）で **pilot**: abstract を **default + map 差分**に置換 | 差分が読みやすい規模で |
| **3** | 残り exporter を順次移行。abstract を **非推奨**にし、最終的に削除 | 全 `npm test` / 必要なら `test:all` |

実装の一括置換は **本チケットのスコープ外**（別チケットでスライスする）。

## 5. リスクとトレードオフ

| 観点 | 内容 |
|------|------|
| **型精度** | map 一本化すると **プロップス型がメソッド名から推論されにくい**。緩和策: 生成コード／`satisfies`／コンパイル時に `EXPORTER_RENDERER_DISPATCH` 型と突き合わせるテスト。 |
| **保守性** | 抽象メソッド列の **「見た目の網羅性」**は薄れるため、**カバレッジテスト**と **descriptor 正本**（[ADR 0004](./adr/0004-component-definition-graph-canonical.md)）との対応表を運用で補う。 |
| **ビルド / ツール** | 完全なコードジェンは不要。段階 1 では **既存 TS + テスト**で足りる。 |
| **挙動差** | Primary と Fallback で **別 map** にしないと、一方だけ実装したハンドラが他方に誤って流れるリスク。 |

## 6. 関連コード・ドキュメント

- `src/exporters/base-component-renderer.ts` — `EXPORTER_RENDERER_DISPATCH`、抽象 `renderXxx`
- `src/components/definitions/exporter-renderer-definitions.ts` — `BUILT_IN_EXPORTER_RENDERER_DEFINITIONS`
- `src/components/definitions/types.ts` — `ExporterRendererMethod`
- [exporter-boundary-guide.md](./exporter-boundary-guide.md) — Primary / Fallback
- [ADR 0004](./adr/0004-component-definition-graph-canonical.md) — component definition graph

## 7. オープンな論点（合意待ち）

- **map のキー**を `ExporterRendererMethod` のみに固定するか、`BuiltInComponentName` を第一キーにするか（現レジストリは kind ベース）。
- **サードパーティ exporter**（将来）を同じ map 契約に載せるか、別インターフェースに分岐するか。
