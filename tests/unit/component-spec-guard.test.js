const assert = require('assert');

/**
 * E1-S1-T4 / T-179: ComponentSpec と BUILT_IN / descriptor / exporter の drift を検知する。
 * 意図的に kind や renderer をずらすと失敗すること。
 */
describe('ComponentSpec guard (T-179)', () => {
  const { BUILT_IN_COMPONENTS } = require('../../out/components/definitions/built-in-components');
  const { COMPONENT_DEFINITIONS } = require('../../out/components/definitions/component-definitions');
  const {
    buildComponentSpecFromDefinition,
    builtInSchemaRef
  } = require('../../out/components/definitions/component-spec');
  const { BUILT_IN_EXPORTER_RENDERER_DEFINITIONS } = require(
    '../../out/components/definitions/exporter-renderer-definitions'
  );

  it('ComponentSpec.kind の集合が BUILT_IN_COMPONENTS と一致する', () => {
    const kinds = COMPONENT_DEFINITIONS.map((d) => buildComponentSpecFromDefinition(d).kind);
    assert.deepStrictEqual([...kinds].sort(), [...BUILT_IN_COMPONENTS].sort());
    assert.strictEqual(new Set(kinds).size, kinds.length, '[spec-guard] kind の重複');
  });

  it('各 ComponentSpec の schemaRef / preview / exporter が descriptor・exporter 定義と一致する', () => {
    for (const def of COMPONENT_DEFINITIONS) {
      const spec = buildComponentSpecFromDefinition(def);
      const name = def.name;
      assert.strictEqual(
        spec.schemaRef,
        builtInSchemaRef(name),
        `[spec-guard]「${name}」schemaRef が builtInSchemaRef と不一致`
      );
      assert.strictEqual(spec.previewRendererKey, name, `[spec-guard]「${name}」previewRendererKey`);
      const exp = BUILT_IN_EXPORTER_RENDERER_DEFINITIONS[name];
      assert.ok(exp, `[spec-guard]「${name}」exporter 定義なし`);
      assert.strictEqual(
        spec.exporterRendererMethod,
        exp.rendererMethod,
        `[spec-guard]「${name}」exporterRendererMethod`
      );
    }
  });
});
