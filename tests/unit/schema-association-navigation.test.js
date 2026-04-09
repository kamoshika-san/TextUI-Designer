const assert = require('assert');

const {
  buildTextUiJsonSchemas,
  buildTextUiYamlSchemas
} = require('../../out/services/schema/schema-association');

describe('schema association navigation flow support', () => {
  it('adds navigation flow yaml glob mapping', () => {
    const schemas = buildTextUiYamlSchemas(
      {},
      'file:///schema.json',
      'file:///navigation-schema.json',
      'file:///template-schema.json',
      'file:///theme-schema.json'
    );

    assert.deepStrictEqual(schemas['file:///navigation-schema.json'], ['*.tui.flow.yml', '*.tui.flow.yaml']);
  });

  it('adds navigation flow json mapping', () => {
    const schemas = buildTextUiJsonSchemas(
      [],
      { $id: 'main' },
      { $id: 'navigation' },
      { $id: 'template' },
      { $id: 'theme' }
    );
    const navigationSchema = schemas.find(entry => Array.isArray(entry.fileMatch) && entry.fileMatch.includes('*.tui.flow.json'));

    assert.ok(navigationSchema);
    assert.strictEqual(navigationSchema.schema.$id, 'navigation');
  });
});
