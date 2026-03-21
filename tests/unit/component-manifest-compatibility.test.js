const assert = require('assert');

/**
 * registry 互換レイヤと manifest / 補完カタログの健全性（Phase 2 分離）。
 */
describe('Component manifest compatibility', () => {
  const {
    BUILT_IN_COMPONENTS,
    COMPONENT_MANIFEST
  } = require('../../out/registry/component-manifest');
  const {
    COMPONENT_DESCRIPTIONS,
    COMPONENT_PROPERTIES
  } = require('../../out/services/completion-component-catalog');

  it('manifest は全組み込みコンポーネントの定義を持つ', () => {
    BUILT_IN_COMPONENTS.forEach(componentName => {
      const entry = COMPONENT_MANIFEST[componentName];
      assert.ok(entry, `${componentName} の manifest 定義がありません`);
      assert.ok(entry.description, `${componentName} の説明がありません`);
      assert.ok(Array.isArray(entry.properties), `${componentName} の properties が配列ではありません`);
      assert.ok(entry.schemaRef, `${componentName} の schemaRef がありません`);
    });
  });

  it('補完定義は COMPONENT_DEFINITIONS（descriptor）由来で manifest と整合する', () => {
    BUILT_IN_COMPONENTS.forEach(componentName => {
      const manifestEntry = COMPONENT_MANIFEST[componentName];
      assert.strictEqual(COMPONENT_DESCRIPTIONS[componentName], manifestEntry.description);
      assert.deepStrictEqual(COMPONENT_PROPERTIES[componentName], manifestEntry.properties);
    });
  });
});
