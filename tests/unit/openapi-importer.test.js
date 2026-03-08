const assert = require('assert');
const fs = require('fs');
const path = require('path');
const YAML = require('yaml');
const { spawnSync } = require('child_process');

describe('OpenAPI importer CLI', () => {
  const repoRoot = path.resolve(__dirname, '../..');
  const cliPath = path.join(repoRoot, 'out/cli/index.js');
  const tmpDir = path.join(repoRoot, '.tmp-openapi-importer-test');

  beforeEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    fs.mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('imports OpenAPI request schema into valid TextUI DSL', () => {
    const openapiPath = path.join(tmpDir, 'openapi.yml');
    const outputPath = path.join(tmpDir, 'from-openapi.tui.yml');
    fs.writeFileSync(openapiPath, `
openapi: 3.0.3
info:
  title: User API
  version: 1.0.0
paths:
  /users:
    post:
      operationId: createUser
      summary: "Create User"
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateUserRequest'
components:
  schemas:
    CreateUserRequest:
      type: object
      required:
        - email
        - role
      properties:
        email:
          type: string
          format: email
        role:
          type: string
          enum: [admin, user]
        marketingOptIn:
          type: boolean
        age:
          type: integer
        birthDate:
          type: string
          format: date
`, 'utf8');

    const imported = spawnSync('node', [
      cliPath,
      'import',
      'openapi',
      '--input',
      openapiPath,
      '--output',
      outputPath,
      '--json'
    ], { encoding: 'utf8' });

    assert.strictEqual(imported.status, 0, imported.stderr || imported.stdout);
    const importedJson = JSON.parse(imported.stdout);
    assert.strictEqual(importedJson.imported, true);
    assert.strictEqual(importedJson.operationId, 'createUser');
    assert.ok(fs.existsSync(outputPath));

    const validate = spawnSync('node', [
      cliPath,
      'validate',
      '--file',
      outputPath,
      '--json'
    ], { encoding: 'utf8' });

    assert.strictEqual(validate.status, 0, validate.stderr || validate.stdout);
    const validateJson = JSON.parse(validate.stdout);
    assert.strictEqual(validateJson.valid, true);

    const dsl = YAML.parse(fs.readFileSync(outputPath, 'utf8'));
    const form = dsl.page.components.find(component => component.Form)?.Form;
    assert.ok(form);
    assert.ok(Array.isArray(form.fields));

    const hasEmailInput = form.fields.some(field => field.Input?.name === 'email' && field.Input?.type === 'email');
    const hasRoleSelect = form.fields.some(field => field.Select?.name === 'role' && Array.isArray(field.Select?.options) && field.Select.options.length === 2);
    const hasBooleanCheckbox = form.fields.some(field => field.Checkbox?.name === 'marketingOptIn');
    const hasNumberInput = form.fields.some(field => field.Input?.name === 'age' && field.Input?.type === 'number');
    const hasBirthDatePicker = form.fields.some(field => field.DatePicker?.name === 'birthDate');

    assert.strictEqual(hasEmailInput, true);
    assert.strictEqual(hasRoleSelect, true);
    assert.strictEqual(hasBooleanCheckbox, true);
    assert.strictEqual(hasNumberInput, true);
    assert.strictEqual(hasBirthDatePicker, true);
  });

  it('supports --operation selection and parameter mapping', () => {
    const openapiPath = path.join(tmpDir, 'multi-openapi.yml');
    const outputPath = path.join(tmpDir, 'invoice.tui.yml');
    fs.writeFileSync(openapiPath, `
openapi: 3.0.3
info:
  title: Multi API
  version: 1.0.0
paths:
  /users:
    post:
      operationId: createUser
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                name:
                  type: string
  /invoices:
    post:
      operationId: createInvoice
      summary: "Create Invoice"
      parameters:
        - name: dryRun
          in: query
          required: false
          schema:
            type: boolean
      requestBody:
        content:
          application/json:
            schema:
              type: object
              required: [invoiceType]
              properties:
                invoiceType:
                  type: string
                  enum: [standard, proforma]
`, 'utf8');

    const imported = spawnSync('node', [
      cliPath,
      'import',
      'openapi',
      '--input',
      openapiPath,
      '--operation',
      'createInvoice',
      '--output',
      outputPath,
      '--json'
    ], { encoding: 'utf8' });

    assert.strictEqual(imported.status, 0, imported.stderr || imported.stdout);
    const importedJson = JSON.parse(imported.stdout);
    assert.strictEqual(importedJson.operationId, 'createInvoice');
    assert.ok(fs.existsSync(outputPath));

    const dsl = YAML.parse(fs.readFileSync(outputPath, 'utf8'));
    assert.strictEqual(dsl.page.id, 'createinvoice');
    const form = dsl.page.components.find(component => component.Form)?.Form;
    assert.ok(form);

    const hasInvoiceTypeSelect = form.fields.some(field => field.Select?.name === 'invoiceType');
    const hasDryRunCheckbox = form.fields.some(field => field.Checkbox?.name === 'dryRun');
    assert.strictEqual(hasInvoiceTypeSelect, true);
    assert.strictEqual(hasDryRunCheckbox, true);
  });

  it('returns exit code 1 when --operation does not exist', () => {
    const openapiPath = path.join(tmpDir, 'single-openapi.yml');
    fs.writeFileSync(openapiPath, `
openapi: 3.0.3
info:
  title: Single API
  version: 1.0.0
paths:
  /users:
    post:
      operationId: createUser
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                name:
                  type: string
`, 'utf8');

    const imported = spawnSync('node', [
      cliPath,
      'import',
      'openapi',
      '--input',
      openapiPath,
      '--operation',
      'notFoundOperation',
      '--output',
      path.join(tmpDir, 'not-used.tui.yml')
    ], { encoding: 'utf8' });

    assert.strictEqual(imported.status, 1);
    assert.match(imported.stderr, /operationId not found/);
  });

  it('imports all operations with --all into output directory', () => {
    const openapiPath = path.join(tmpDir, 'all-openapi.yml');
    const outputDir = path.join(tmpDir, 'generated-all');
    fs.writeFileSync(openapiPath, `
openapi: 3.0.3
info:
  title: Batch API
  version: 1.0.0
paths:
  /users:
    post:
      operationId: createUser
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                email:
                  type: string
                  format: email
  /invoices:
    post:
      operationId: createInvoice
      parameters:
        - name: dryRun
          in: query
          schema:
            type: boolean
`, 'utf8');

    const imported = spawnSync('node', [
      cliPath,
      'import',
      'openapi',
      '--input',
      openapiPath,
      '--all',
      '--output-dir',
      outputDir,
      '--json'
    ], { encoding: 'utf8' });

    assert.strictEqual(imported.status, 0, imported.stderr || imported.stdout);
    const parsed = JSON.parse(imported.stdout);
    assert.strictEqual(parsed.mode, 'all');
    assert.strictEqual(parsed.generated, 2);
    assert.strictEqual(parsed.files.length, 2);

    parsed.files.forEach(file => {
      assert.ok(fs.existsSync(file.output));
      const validate = spawnSync('node', [cliPath, 'validate', '--file', file.output, '--json'], { encoding: 'utf8' });
      assert.strictEqual(validate.status, 0, validate.stderr || validate.stdout);
    });
  });

  it('returns exit code 1 when --all and --operation are used together', () => {
    const openapiPath = path.join(tmpDir, 'exclusive-openapi.yml');
    fs.writeFileSync(openapiPath, `
openapi: 3.0.3
info:
  title: Exclusive API
  version: 1.0.0
paths:
  /users:
    post:
      operationId: createUser
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                name:
                  type: string
`, 'utf8');

    const imported = spawnSync('node', [
      cliPath,
      'import',
      'openapi',
      '--input',
      openapiPath,
      '--all',
      '--operation',
      'createUser'
    ], { encoding: 'utf8' });

    assert.strictEqual(imported.status, 1);
    assert.match(imported.stderr, /cannot be used together/);
  });
});
