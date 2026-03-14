const assert = require('assert');
const path = require('path');
const fs = require('fs');
const Ajv = require('ajv');

describe('Schema table cell component support', () => {
  it('Table.rows のセル値としてコンポーネント定義を許可する', () => {
    const schemaPath = path.resolve(__dirname, '..', '..', 'schemas', 'schema.json');
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    const ajv = new Ajv({ allErrors: true });
    const validate = ajv.compile(schema);

    const valid = validate({
      page: {
        components: [
          {
            Table: {
              columns: [{ key: 'name', header: 'Name' }, { key: 'action', header: 'Action' }],
              rows: [{ name: 'Alice', action: { Button: { label: 'Open' } } }]
            }
          }
        ]
      }
    });

    assert.strictEqual(valid, true, JSON.stringify(validate.errors));
  });
});
