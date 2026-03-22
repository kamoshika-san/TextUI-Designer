/**
 * DSL 型の公開エントリ（RF1-S1-T2）。
 * 既存の `from '.../domain/dsl-types'` import は本 `index.ts` に解決され、互換を維持する。
 * 物理分割は RF1-S2 以降 — 分割時もこの index の再エクスポートを安定 API とする。
 */
export * from './dsl-types';
