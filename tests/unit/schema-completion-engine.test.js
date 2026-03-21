const assert = require('assert');
const { describe, it } = require('mocha');
const { expect } = require('chai');

const { SchemaCompletionEngine } = require('../../out/services/schema-completion-engine');
const { COMPONENT_DEFINITIONS } = require('../../out/components/definitions/component-definitions');

describe('SchemaCompletionEngine', () => {
  const engine = new SchemaCompletionEngine();

  it('component-list コンテキストでコンポーネント候補を返す', () => {
    const items = engine.generateCompletionItemsFromSchema({
      type: 'component-list'
    });

    expect(items.length).to.be.greaterThan(0);
    expect(items.some((item) => item.label === 'Text')).to.equal(true);
  });

  it('getComponentCompletions は COMPONENT_DEFINITIONS の件数・順序・コンポーネント名と一致する（descriptor drift 防止）', () => {
    const items = engine.getComponentCompletions();
    assert.strictEqual(items.length, COMPONENT_DEFINITIONS.length);
    COMPONENT_DEFINITIONS.forEach((def, i) => {
      assert.strictEqual(items[i].label, def.name);
    });
  });

  it('property-value コンテキストで値候補を返す', () => {
    const items = engine.generateCompletionItemsFromSchema({
      type: 'property-value',
      propertyName: 'variant',
      componentName: 'Text'
    });

    expect(items.some((item) => item.label === 'h1')).to.equal(true);
  });

  it('不正 YAML は parseYamlForSyntaxValidation で reject される', async () => {
    let thrown = false;
    try {
      await engine.parseYamlForSyntaxValidation('a: : b');
    } catch (error) {
      thrown = true;
    }
    expect(thrown).to.equal(true);
  });
});
