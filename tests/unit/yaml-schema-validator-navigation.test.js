const assert = require('assert');
const path = require('path');

require('ts-node/register/transpile-only');

describe('YamlSchemaValidator navigation schema routing', () => {
  let YamlSchemaValidator;

  before(() => {
    ({ YamlSchemaValidator } = require(path.resolve(__dirname, '../../src/services/webview/yaml-schema-validator.ts')));
  });

  it('uses loadNavigationSchema for flow DSL files', async () => {
    let loadSchemaCallCount = 0;
    let loadNavigationSchemaCallCount = 0;

    const validator = new YamlSchemaValidator({
      loadSchema: async () => {
        loadSchemaCallCount += 1;
        return {
          type: 'object',
          required: ['page'],
          properties: {
            page: { type: 'object' }
          }
        };
      },
      loadNavigationSchema: async () => {
        loadNavigationSchemaCallCount += 1;
        return {
          type: 'object',
          required: ['flow'],
          properties: {
            flow: { type: 'object' }
          }
        };
      }
    });

    const errors = await validator.validate({
      flow: {
        id: 'checkout-flow'
      }
    }, 'C:/workspace/app.tui.flow.yml');

    assert.strictEqual(loadSchemaCallCount, 0);
    assert.strictEqual(loadNavigationSchemaCallCount, 1);
    assert.strictEqual(errors, null);
  });
});
