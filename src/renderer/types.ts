/**
 * WebView / プレビュー向けの DSL 型エントリポイント。
 * 実体の定義・ガード・DSL 種別定数の正本は `src/domain/dsl-types.ts`（ADR 0003）。
 * プレビュー専用の型は後続で `preview-types.ts` 等へ分離予定。
 */
export * from '../domain/dsl-types';
