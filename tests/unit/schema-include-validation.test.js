const assert = require('assert');
const path = require('path');
const fs = require('fs');
const Ajv = require('ajv');

describe('Schema include validation', () => {
  const loadJson = (relativePath) => {
    const absolutePath = path.resolve(__dirname, '..', '..', relativePath);
    return JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
  };

  it('schema.json は components 内の $include を許可する', () => {
    const schema = loadJson('schemas/schema.json');
    const ajv = new Ajv({ allErrors: true });
    const validate = ajv.compile(schema);

    const valid = validate({
      page: {
        components: [
          {
            $include: {
              template: './templates/header.template.yml',
              params: {
                title: 'hello'
              }
            }
          }
        ]
      }
    });

    assert.strictEqual(valid, true, JSON.stringify(validate.errors));
  });

  it('template-schema.json は配列ルートの $include を許可する', () => {
    const schema = loadJson('schemas/template-schema.json');
    const ajv = new Ajv({ allErrors: true });
    const validate = ajv.compile(schema);

    const valid = validate([
      {
        $include: {
          template: './partials/field.template.yml'
        }
      }
    ]);

    assert.strictEqual(valid, true, JSON.stringify(validate.errors));
  });

  it('$include.template が無い場合は不正', () => {
    const schema = loadJson('schemas/schema.json');
    const ajv = new Ajv({ allErrors: true });
    const validate = ajv.compile(schema);

    const valid = validate({
      page: {
        components: [
          {
            $include: {
              params: {
                title: 'missing template path'
              }
            }
          }
        ]
      }
    });

    assert.strictEqual(valid, false);
  });
});
