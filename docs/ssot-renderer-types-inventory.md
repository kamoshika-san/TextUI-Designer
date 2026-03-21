# SSoT renderer/types 依存棚卸し

本メモは `renderer/types` 依存の棚卸し結果を、実装レイヤごとに短く参照できるようにまとめたものです。

## レイヤ別サマリ

- renderer: `src/renderer/types.ts` を thin facade として維持。
- core: `renderer/types` の直接参照は未検出。
- exporters: `domain/dsl-types` 参照中心。ガード追加で逸脱を検知。
- cli / utils / registry / types: `renderer/types` 直接参照の混入をガードで検知。
- tests: SSoT ガード系テストで境界逸脱を検知。

## 運用メモ

- 新規の共有 DSL 型は `domain/dsl-types` を正本として追加する。
- 互換窓口として `renderer/types` を使う場合は理由を明記し、段階的縮退を前提にする。
