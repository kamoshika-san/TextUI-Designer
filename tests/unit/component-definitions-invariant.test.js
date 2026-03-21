const assert = require('assert');

/**
 * T-20260321-017: COMPONENT_DEFINITIONS の件数・exporter メタ整合を検証する。
 * ビルド成果物（out/）前提。先に `npm run compile` 済みであること。
 */
describe('Component definitions (descriptor graph Step1)', () => {
  const { COMPONENT_DEFINITIONS } = require('../../out/components/definitions/component-definitions');
  const { BUILT_IN_COMPONENTS } = require('../../out/components/definitions/built-in-components');
  const { BUILT_IN_EXPORTER_RENDERER_DEFINITIONS } = require(
    '../../out/components/definitions/exporter-renderer-definitions'
  );

  it('COMPONENT_DEFINITIONS の件数は BUILT_IN_COMPONENTS と一致する', () => {
    assert.strictEqual(COMPONENT_DEFINITIONS.length, BUILT_IN_COMPONENTS.length);
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
