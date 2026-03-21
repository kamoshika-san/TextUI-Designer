const assert = require('assert');

/**
 * T-20260321-017: COMPONENT_DEFINITIONS の件数・exporter メタ整合を検証する。
 * T-20260321-028: name 順序・schemaRef の manifest 整合を追加（description/properties は別スイートでカバー）。
 * ビルド成果物（out/）前提。先に `npm run compile` 済みであること。
 */
describe('Component definitions (descriptor graph Step1)', () => {
  const { COMPONENT_DEFINITIONS } = require('../../out/components/definitions/component-definitions');
  const { BUILT_IN_COMPONENTS } = require('../../out/components/definitions/built-in-components');
  const { COMPONENT_MANIFEST } = require('../../out/components/definitions/manifest');
  const { BUILT_IN_EXPORTER_RENDERER_DEFINITIONS } = require(
    '../../out/components/definitions/exporter-renderer-definitions'
  );

  it('COMPONENT_DEFINITIONS の件数は BUILT_IN_COMPONENTS と一致する', () => {
    assert.strictEqual(COMPONENT_DEFINITIONS.length, BUILT_IN_COMPONENTS.length);
  });

  it('COMPONENT_DEFINITIONS の name 列は BUILT_IN_COMPONENTS と順序一致（drift 防止・T-20260321-028）', () => {
    assert.deepStrictEqual(
      COMPONENT_DEFINITIONS.map((d) => d.name),
      [...BUILT_IN_COMPONENTS]
    );
  });

  it('各定義の schemaRef が COMPONENT_MANIFEST と一致する（T-20260321-028）', () => {
    for (const def of COMPONENT_DEFINITIONS) {
      const entry = COMPONENT_MANIFEST[def.name];
      assert.ok(entry, `${def.name} の manifest がありません`);
      assert.strictEqual(def.schemaRef, entry.schemaRef);
    }
  });

  it('各定義に previewRendererKey / exporterRendererMethod が exporter 定義と一致する', () => {
    for (const def of COMPONENT_DEFINITIONS) {
      assert.strictEqual(def.previewRendererKey, def.name);
      const exp = BUILT_IN_EXPORTER_RENDERER_DEFINITIONS[def.name];
      assert.ok(exp, `${def.name} の exporter 定義がありません`);
      assert.strictEqual(def.exporterRendererMethod, exp.rendererMethod);
      assert.strictEqual(def.tokenStyleProperty, exp.tokenStyleProperty);
    }
  });
});
