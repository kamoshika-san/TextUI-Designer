# E-DSL-SSOT-Complete 完了判定チェックリスト

このチェックリストは、`E-DSL-SSOT-Complete` を Ticket Manager が `done` 判定するための固定基準です。  
判定者が変わっても同じ結論になるよう、必須項目を明文化します。

## Current closeout snapshot（2026-03-27）

- `npm run check:dsl-types-ssot`: `domain/dsl-types imports: 74` / `renderer/types imports: 0`
- renderer component migration: closeout 済み
- `src/renderer/types.ts`: thin facade 維持中
- facade 削除: 未実施。現時点では epic 完了条件ではなく、別 ticket 判断

## 判定ルール

- 必須項目は **全て達成**で完了。
- 1つでも未達がある場合は `done` にしない（差し戻しまたは追加チケット化）。
- 例外運用をする場合は、理由と期限をチケット本文に記録する。

## 必須チェック（完了条件）

### 1) 正本一元化

- [ ] 共有 DSL 型の正本が `src/domain/dsl-types/（公開エントリ: index.ts）` のみである。
- [ ] 新規共有型の追加導線が `domain/dsl-types` 起点で運用されている。

### 2) thin facade 維持

- [ ] `src/renderer/types.ts` が thin facade（再エクスポート中心）を維持している。
- [ ] 型本体や新規ロジックを `renderer/types` 側に追加していない。
- [ ] facade を残す判断と facade を削除する判断を混同せず、削除が必要なら別 ticket / 別レビューで扱っている。

### 3) 禁止 import なし

- [ ] `core / exporters / cli / utils / tests` で `renderer/types` 直接依存が禁止ルールに従っている。
- [ ] SSoT import guard と ESLint 制約の両方で逸脱が検知可能な状態である。

### 4) 検証通過（test / lint / compile）

- [ ] `npm run compile` が成功。
- [ ] `npm run lint` が成功。
- [ ] `npm run test:unit`（または PM 指定の同等以上テスト）が成功。
- [ ] `npm run check:dsl-types-ssot` が成功し、snapshot を関連 docs と同期できている。

### 5) 型追加手順の文書化

- [ ] 型追加の手順テンプレートが開発者向けドキュメントに反映済み。
- [ ] `renderer/types` を増やさない方針がドキュメントに明記されている。
- [ ] historical planning / PoC docs を current backlog source と誤読しないよう、maintainer 入口文書に current source of truth が明記されている。

## 記録テンプレート（TM 用）

以下をチケット本文の「結果」か TM レターに残す。

```md
- 判定日: YYYY-MM-DD
- 判定者: TM
- 対象エピック: E-DSL-SSOT-Complete
- 判定: pass / fail
- 未達項目（fail時）:
  - <項目>
- 備考:
  - <必要なら記載>
```

## 参照

- `docs/adr/0003-dsl-types-canonical-source.md`
- `docs/adding-built-in-component.md`
- `docs/dsl-types-renderer-types-inventory.md`
- `docs/ssot-renderer-facade-sprint3-decision.md`
- `docs/ssot-import-guard-matrix.md`
- `tests/unit/*ssot*`
- `eslint.config.mjs`
