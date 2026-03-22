/**
 * DSL 型の公開エントリ（RF1-S1-T2 / RF1-S2-T4）。
 * 既存の `from '.../domain/dsl-types'` import は本 `index.ts` に解決され、互換を維持する。
 * 実体は `dsl-types.ts` が各領域モジュールをまとめて再エクスポートする（直接 `text-navigation-media.ts` 等を import しない）。
 */
export * from './dsl-types';
