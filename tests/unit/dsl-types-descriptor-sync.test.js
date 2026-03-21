const assert = require('assert');

/**
 * T-20260321-024 (Step 8): descriptor / DSL 型の change amplification を検知する。
 * ビルド成果物（out/）前提。先に `npm run compile` 済みであること。
 *
 * 新ビルトインコンポーネント追加時の最小チェックリスト（手動・別チケットで拡張可）:
 * - `built-in-components.ts` の BUILT_IN_COMPONENTS
 * - `component-definitions.ts` / manifest / exporter-renderer 定義
 * - `src/domain/dsl-types.ts` の DSL_COMPONENT_KINDS と ComponentDef union
 */
describe('DSL types vs descriptor (change amplification)', () => {
  const { DSL_COMPONENT_KINDS } = require('../../out/domain/dsl-types');
  const { BUILT_IN_COMPONENTS } = require('../../out/components/definitions/built-in-components');

  it('DSL_COMPONENT_KINDS と BUILT_IN_COMPONENTS が同一集合である', () => {
    const fromDsl = [...DSL_COMPONENT_KINDS].sort();
    const fromBuiltIn = [...BUILT_IN_COMPONENTS].sort();
    assert.deepStrictEqual(fromDsl, fromBuiltIn);
  });
});
