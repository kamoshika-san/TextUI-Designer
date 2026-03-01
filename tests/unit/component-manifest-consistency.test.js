const assert = require('assert');
const fs = require('fs');
const path = require('path');

describe('Component manifest consistency', () => {
  const workspaceRoot = path.resolve(__dirname, '../..');
  const schemaPath = path.join(workspaceRoot, 'schemas', 'schema.json');

  const {
    BUILT_IN_COMPONENTS,
    COMPONENT_MANIFEST,
    getComponentSchemaRefs
  } = require('../../out/registry/component-manifest');
  const {
    COMPONENT_DESCRIPTIONS,
    COMPONENT_PROPERTIES
  } = require('../../out/services/completion-component-catalog');

  const getSchemaComponentRefs = () => {
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    const oneOf = schema?.definitions?.component?.oneOf || [];
    return oneOf
      .map(definition => definition && definition.$ref)
      .filter(ref => typeof ref === 'string');
  };

  it('manifest は全組み込みコンポーネントの定義を持つ', () => {
    BUILT_IN_COMPONENTS.forEach(componentName => {
      const entry = COMPONENT_MANIFEST[componentName];
      assert.ok(entry, `${componentName} の manifest 定義がありません`);
      assert.ok(entry.description, `${componentName} の説明がありません`);
      assert.ok(Array.isArray(entry.properties), `${componentName} の properties が配列ではありません`);
      assert.ok(entry.schemaRef, `${componentName} の schemaRef がありません`);
    });
  });

  it('schema の oneOf 参照は manifest と一致する', () => {
    const expectedRefs = [...getComponentSchemaRefs()].sort();
    const actualRefs = [...getSchemaComponentRefs()].sort();
    assert.deepStrictEqual(actualRefs, expectedRefs);
  });

  it('補完定義は manifest から生成される', () => {
    BUILT_IN_COMPONENTS.forEach(componentName => {
      const manifestEntry = COMPONENT_MANIFEST[componentName];
      assert.strictEqual(COMPONENT_DESCRIPTIONS[componentName], manifestEntry.description);
      assert.deepStrictEqual(COMPONENT_PROPERTIES[componentName], manifestEntry.properties);
    });
  });
});
