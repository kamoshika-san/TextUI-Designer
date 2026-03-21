const assert = require('assert');

/**
 * T-20260321-103: built-in 一覧・descriptor グラフ・manifest（schema）・exporter handler を
 * 1 の describe で横断し、ズレた経路が分かるメッセージで失敗する。
 * （詳細な個別不変条件は `component-definitions-invariant.test.js` 等と役割分担）
 */
describe('Component contract consistency (T-103)', () => {
  const { BUILT_IN_COMPONENTS } = require('../../out/components/definitions/built-in-components');
  const { COMPONENT_DEFINITIONS } = require('../../out/components/definitions/component-definitions');
  const { COMPONENT_MANIFEST } = require('../../out/components/definitions/manifest');
  const { BUILT_IN_EXPORTER_RENDERER_DEFINITIONS } = require(
    '../../out/components/definitions/exporter-renderer-definitions'
  );
  const { builtInSchemaRef } = require('../../out/components/definitions/component-spec');

  it('built-in / descriptor / manifest schemaRef / exporter handler が全コンポーネントで閉じている', () => {
    assert.strictEqual(
      COMPONENT_DEFINITIONS.length,
      BUILT_IN_COMPONENTS.length,
      '[contract] descriptor 件数が built-in 列挙と一致しない（built-in か COMPONENT_DEFINITIONS の更新漏れ）'
    );

    const builtInSet = new Set(BUILT_IN_COMPONENTS);
    const descriptorNames = COMPONENT_DEFINITIONS.map((d) => d.name);

    for (const name of descriptorNames) {
      assert.ok(
        builtInSet.has(name),
        `[contract] descriptor「${name}」が BUILT_IN_COMPONENTS に無い（built-in 一覧の追加・削除と不整合）`
      );

      const def = COMPONENT_DEFINITIONS.find((d) => d.name === name);
      const manifest = COMPONENT_MANIFEST[name];
      assert.ok(manifest, `[contract]「${name}」の COMPONENT_MANIFEST エントリが無い`);
      assert.strictEqual(
        def.schemaRef,
        builtInSchemaRef(name),
        `[contract]「${name}」の schemaRef が built-in 既定と不一致（T-177 単一ソース）`
      );

      assert.strictEqual(
        def.previewRendererKey,
        name,
        `[contract]「${name}」の previewRendererKey が名前と一致しない（プレビュー registry 経路）`
      );

      const exp = BUILT_IN_EXPORTER_RENDERER_DEFINITIONS[name];
      assert.ok(exp, `[contract]「${name}」の exporter renderer 定義が無い`);
      assert.strictEqual(
        def.exporterRendererMethod,
        exp.rendererMethod,
        `[contract]「${name}」の exporterRendererMethod が定義と不一致`
      );
    }
  });
});
