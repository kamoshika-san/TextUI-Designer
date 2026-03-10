const assert = require('assert');

const { resolveSchema } = require('../../out/cli/openapi/schema-resolver');
const { buildOperationList, selectOperation } = require('../../out/cli/openapi/operation-selector');
const { createImportResult } = require('../../out/cli/openapi/dsl-builder');

describe('OpenAPI layer modules', () => {
  it('resolveSchema merges allOf and resolves refs', () => {
    const document = {
      components: {
        schemas: {
          Base: {
            type: 'object',
            required: ['email'],
            properties: {
              email: { type: 'string', format: 'email' }
            }
          },
          Extended: {
            allOf: [
              { $ref: '#/components/schemas/Base' },
              {
                type: 'object',
                required: ['age'],
                properties: {
                  age: { type: 'integer' }
                }
              }
            ]
          }
        }
      }
    };

    const resolved = resolveSchema({ $ref: '#/components/schemas/Extended' }, document);
    assert.strictEqual(resolved.type, 'object');
    assert.deepStrictEqual(resolved.required.sort(), ['age', 'email']);
    assert.ok(resolved.properties.email);
    assert.ok(resolved.properties.age);
  });

  it('selectOperation prefers importable operation when operationId is omitted', () => {
    const document = {
      paths: {
        '/empty': {
          get: {
            operationId: 'emptyGet'
          }
        },
        '/users': {
          post: {
            operationId: 'createUser',
            requestBody: {
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    };

    const selected = selectOperation(document);
    assert.strictEqual(selected.operationId, 'createUser');
  });

  it('buildOperationList creates sanitized fallback operationId when absent', () => {
    const document = {
      paths: {
        '/users/{id}': {
          patch: {
            summary: 'update user'
          }
        }
      }
    };

    const operations = buildOperationList(document);
    assert.strictEqual(operations.length, 1);
    assert.strictEqual(operations[0].operationId, 'patch-users-id');
  });

  it('createImportResult returns null for operations without importable fields', () => {
    const operation = {
      method: 'post',
      path: '/users',
      operationId: 'createUser',
      operation: {
        summary: 'Create user'
      }
    };

    const result = createImportResult(operation, { paths: {} });
    assert.strictEqual(result, null);
  });
});
