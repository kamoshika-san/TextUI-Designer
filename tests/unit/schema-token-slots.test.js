const assert = require('assert');
const fs = require('fs');
const path = require('path');

function loadSchema() {
  const schemaPath = path.resolve(__dirname, '..', '..', 'schemas', 'schema.json');
  return JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
}

describe('schema tokenSlots support (T-20260322-339)', () => {
  it('Text allows tokenSlots[] alongside token', () => {
    const schema = loadSchema();
    const tokenSlots = schema.definitions.Text.properties.Text.properties.tokenSlots;
    assert.ok(tokenSlots);
    assert.strictEqual(tokenSlots.type, 'array');
    assert.deepStrictEqual(tokenSlots.items, { $ref: '#/definitions/tokenRef' });
  });

  it('Container allows tokenSlots[] alongside token', () => {
    const schema = loadSchema();
    const tokenSlots = schema.definitions.Container.properties.Container.properties.tokenSlots;
    assert.ok(tokenSlots);
    assert.strictEqual(tokenSlots.type, 'array');
    assert.deepStrictEqual(tokenSlots.items, { $ref: '#/definitions/tokenRef' });
  });
});
