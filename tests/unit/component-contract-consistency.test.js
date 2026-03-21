const assert = require('assert');

const PATHS = {
  builtIn: 'src/components/definitions/built-in-components.ts',
  definitions: 'src/components/definitions/component-definitions.ts',
  manifest: 'src/components/definitions/manifest.ts',
  exporterDefs: 'src/components/definitions/exporter-renderer-definitions.ts',
  componentSpec: 'src/components/definitions/component-spec.ts'
};

/**
 * T-20260321-103: built-in 一覧・descriptor グラフ・manifest（schema）・exporter handler を
 * 1 の describe で横断し、ズレた経路が分かるメッセージで失敗する。
 * T-189: 失敗時に「直すファイル・キー」をメッセージへ含める。
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
      `[contract] descriptor 件数 (${COMPONENT_DEFINITIONS.length}) が built-in 列挙 (${BUILT_IN_COMPONENTS.length}) と不一致\n` +
        `  → ${PATHS.builtIn} の BUILT_IN_COMPONENTS と ${PATHS.definitions} の COMPONENT_DEFINITIONS（BUILT_IN_COMPONENT_SPECS 由来）を揃える`
    );

    const builtInSet = new Set(BUILT_IN_COMPONENTS);
    const descriptorNames = COMPONENT_DEFINITIONS.map((d) => d.name);

    for (const name of descriptorNames) {
      assert.ok(
        builtInSet.has(name),
        `[contract] descriptor「${name}」が BUILT_IN_COMPONENTS に無い\n` +
          `  → ${PATHS.builtIn} の BUILT_IN_COMPONENTS に「${name}」を追加するか、` +
          `${PATHS.definitions} 側の余分な行を削除する`
      );

      const def = COMPONENT_DEFINITIONS.find((d) => d.name === name);
      const manifest = COMPONENT_MANIFEST[name];
      assert.ok(
        manifest,
        `[contract]「${name}」の COMPONENT_MANIFEST エントリが無い\n` +
          `  → ${PATHS.manifest} の COMPONENT_MANIFEST["${name}"] を追加（補完・説明文の正本）`
      );
      assert.strictEqual(
        def.schemaRef,
        builtInSchemaRef(name),
        `[contract]「${name}」の schemaRef が built-in 既定と不一致（T-177 単一ソース）\n` +
          `  → ${PATHS.definitions} の該当行、または ${PATHS.componentSpec} の builtInSchemaRef(name) と整合させる`
      );

      assert.strictEqual(
        def.previewRendererKey,
        name,
        `[contract]「${name}」の previewRendererKey が名前と一致しない\n` +
          `  → ${PATHS.definitions} の COMPONENT_DEFINITIONS / BUILT_IN_COMPONENT_SPECS で previewRendererKey を "${name}" に揃える`
      );

      const exp = BUILT_IN_EXPORTER_RENDERER_DEFINITIONS[name];
      assert.ok(
        exp,
        `[contract]「${name}」の exporter renderer 定義が無い\n` +
          `  → ${PATHS.exporterDefs} の BUILT_IN_EXPORTER_RENDERER_DEFINITIONS["${name}"] を追加`
      );
      assert.strictEqual(
        def.exporterRendererMethod,
        exp.rendererMethod,
        `[contract]「${name}」の exporterRendererMethod が定義と不一致\n` +
          `  → ${PATHS.definitions} の exporterRendererMethod と ${PATHS.exporterDefs} の rendererMethod を揃える`
      );
    }
  });
});
