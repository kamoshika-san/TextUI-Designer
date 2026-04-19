# 互換レイヤ縮小 — 条件・順序チェックリスト（T-20260321-071 バッチ A）

本書は、**複数の互換レイヤ**（registry の re-export、DSL 型の WebView 向け re-export 等）を**段階的に薄くする**ときの **ゲート条件**と **推奨順序**を 1 箇所にまとめたものです。  
個別のルールの正本は次を参照してください。

- registry: [registry-compat-layer-policy.md](registry-compat-layer-policy.md)
- 公開 API / 設定 / exporter: [api-compat-policy.md](api-compat-policy.md)
- ドメイン型と `renderer/types`: [MAINTAINER_GUIDE.md](MAINTAINER_GUIDE.md)（DSL 行）、[change-amplification-dsl.md](change-amplification-dsl.md)

## 1. レイヤー分類（縮小対象の棚）

| 種別 | 代表例 | 正本の例 | 主なガード |
|------|--------|----------|------------|
| **Registry 互換** | `component-manifest` / `component-registry` からの再エクスポート | `built-in-components` / `component-definitions` / `schema-descriptor-selectors` | `registry-compat-import-guard.test.js` |
| **型・契約の re-export** | `renderer/types.ts` が `domain/dsl-types` を再公開 | `src/domain/dsl-types/（公開エントリ: index.ts）` | `dsl-types-descriptor-sync.test.js` 等 |
| **公開契約そのもの** | CLI オプション、MCP DTO、WebView メッセージ形 | 各境界ガイド | 境界ガイドのレビュー項目 |

## 2. 削除・薄化の条件（すべて満たすこと）

1. **参照ゼロ（src）**: 互換経由 import が `src/` から消えている（ポリシー各紙の「利用箇所ゼロ」に相当）。
2. **正本パイプラインの確認**: 代替経路が descriptor / schema / 型チェックでカバーされている（registry ポリシー §3 と同趣旨）。
3. **回帰**: 少なくとも `npm test`（unit）が通る。影響が広い場合は `npm run test:all` を推奨。
4. **外部契約の確認**: 公開 API・設定・exporter に触れる場合は [api-compat-policy.md](api-compat-policy.md) §4 のチェックリストを踏む。
5. **許可リスト**: registry の **許可リスト**を更新する場合は、PR で理由・期限を明記しレビューで合意する（[registry-compat-layer-policy.md](registry-compat-layer-policy.md) §2）。

## 3. 推奨順序（複数レイヤを同時にいじらない）

1. **新規侵入を止める** — 互換レイヤへの **新規 import を増やさない**（既存ガードを緑に保つ）。
2. **Registry から先に寄せる** — `component-manifest` / `component-registry` 経由を **正本モジュール**へ置換（棚卸し表は registry ポリシー §4）。理由: ガードテストが明確で、カタログ・スキーマと直結。
3. **型 re-export を後段で** — `renderer/types` 等は **WebView / preview が依存**しやすいため、registry より後に、境界テストとセットで縮小する。
4. **ファイル削除は最後** — re-export ファイルの **物理削除**は、外部拡張や `out/` 経由の参照調査後に **別チケット**でもよい（registry ポリシー §3 脚注と同じ）。
5. **テストの src 直参照拡大（バッチ B）** — 構造変更の反復速度用に、critical path の fast test を `src` 直参照へ寄せる。詳細はチケット **T-20260321-071** の「次アクション」および `Tasks/Archive` の関連チケットを参照。

## 4. PR 前チェックリスト（コピー用）

- [ ] どのレイヤ（registry / 型 / 公開契約）を変えるか 1 行で書いた
- [ ] 正本への import 置換が完了している、または許可リスト更新がレビュー済み
- [ ] `npm test`（必要なら `npm run test:all`）が通った
- [ ] 破壊的になりうる場合、api-compat §4 を満たした
- [ ] リリースノート / 移行メモが必要か判断した

## 5. 次アクション（本チケットのバッチ B）

- critical path の **1 本**を `src` 直参照の fast test に追加または移行する（**1 コミット**）。既存の src 直参照拡大チケットと重複しないよう `Tasks` を確認すること。

## 参照

- [registry-compat-layer-policy.md](registry-compat-layer-policy.md)
- [api-compat-policy.md](api-compat-policy.md)
- [MAINTAINER_GUIDE.md](MAINTAINER_GUIDE.md)
