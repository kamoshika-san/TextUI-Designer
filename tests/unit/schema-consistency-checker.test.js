const assert = require('assert');

const { BUILT_IN_COMPONENTS, getComponentSchemaRefs } = require('../../out/registry/component-manifest');
const { validateSchemaConsistency } = require('../../out/services/schema/schema-consistency-checker');

function buildBaseSchema(oneOfRefs) {
  return {
    definitions: {
      component: {
        oneOf: oneOfRefs.map($ref => ({ $ref }))
      },
      ...Object.fromEntries(BUILT_IN_COMPONENTS.map(name => [name, { type: 'object' }]))
    }
  };
}

describe('schema-consistency-checker', () => {
  it('oneOf の順序不一致を検知する', () => {
    const expectedRefs = getComponentSchemaRefs();
    const actualRefs = [...expectedRefs];
    // 最初の2要素だけ入れ替える（集合は同じ）
    [actualRefs[0], actualRefs[1]] = [actualRefs[1], actualRefs[0]];

    const schema = buildBaseSchema(actualRefs);
    assert.throws(() => validateSchemaConsistency(schema), /oneOf順序不一致/);
  });

  it('oneOf の重複参照を検知する', () => {
    const expectedRefs = getComponentSchemaRefs();
    const actualRefs = [expectedRefs[0], expectedRefs[0], ...expectedRefs.slice(2)];

    const schema = buildBaseSchema(actualRefs);
    assert.throws(() => validateSchemaConsistency(schema), /oneOf重複参照/);
  });

  it('definitions 側の欠落を検知する', () => {
    const expectedRefs = getComponentSchemaRefs();
    const schema = buildBaseSchema(expectedRefs);

    delete schema.definitions.Icon;
    assert.throws(() => validateSchemaConsistency(schema), /definitions不足/);
  });
});

