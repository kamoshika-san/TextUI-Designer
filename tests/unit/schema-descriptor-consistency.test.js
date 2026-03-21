const assert = require('assert');
const fs = require('fs');
const path = require('path');

/**
 * descriptor / schema パイプライン整合（Phase 2 分離）。registry 互換は参照しない。
 */
describe('Schema descriptor consistency', () => {
  const workspaceRoot = path.resolve(__dirname, '../..');
  const schemaPath = path.join(workspaceRoot, 'schemas', 'schema.json');

  const { getComponentSchemaRefs } = require('../../out/services/schema/schema-descriptor-selectors');
  const { COMPONENT_DEFINITIONS } = require('../../out/components/definitions/component-definitions');

  const getSchemaComponentRefs = () => {
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    const oneOf = schema?.definitions?.component?.oneOf || [];
    return oneOf
      .map(definition => definition && definition.$ref)
      .filter(ref => typeof ref === 'string');
  };

  it('schema の oneOf 参照は descriptor selector の schemaRef 列と一致する', () => {
    const expectedRefs = [...getComponentSchemaRefs()].sort();
    const actualRefs = [...getSchemaComponentRefs()].sort();
    assert.deepStrictEqual(actualRefs, expectedRefs);
  });

  it('getComponentSchemaRefs は COMPONENT_DEFINITIONS の schemaRef 列と一致する', () => {
    const fromDescriptor = COMPONENT_DEFINITIONS.map(d => d.schemaRef);
    assert.deepStrictEqual(getComponentSchemaRefs(), fromDescriptor);
  });
});
