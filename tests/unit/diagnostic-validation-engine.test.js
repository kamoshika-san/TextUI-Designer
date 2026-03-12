const assert = require('assert');

const {
  DiagnosticValidationEngine
} = require('../../out/services/diagnostics/diagnostic-validation-engine');

describe('DiagnosticValidationEngine', () => {
  const createSchemaManager = () => {
    const mainSchema = {
      type: 'object',
      properties: {
        page: { type: 'object' }
      },
      required: ['page']
    };

    const templateSchema = {
      type: 'object',
      properties: {
        template: { type: 'string' }
      }
    };

    const themeSchema = {
      type: 'object',
      properties: {
        theme: { type: 'object' }
      },
      required: ['theme']
    };

    let mainCalls = 0;
    let templateCalls = 0;
    let themeCalls = 0;

    return {
      schemaManager: {
        loadSchema: async () => {
          mainCalls += 1;
          return mainSchema;
        },
        loadTemplateSchema: async () => {
          templateCalls += 1;
          return templateSchema;
        },
        loadThemeSchema: async () => {
          themeCalls += 1;
          return themeSchema;
        }
      },
      getCallCounts: () => ({ mainCalls, templateCalls, themeCalls })
    };
  };

  it('validates YAML and returns AJV errors when invalid', async () => {
    const { schemaManager } = createSchemaManager();
    const engine = new DiagnosticValidationEngine(schemaManager, 5000);

    const result = await engine.validateText('meta: {}', 'main');

    assert.strictEqual(result.errorMessage, null);
    assert.ok(Array.isArray(result.errors));
    assert.strictEqual(result.errors.length > 0, true);
  });

  it('returns parse error message when YAML is invalid', async () => {
    const { schemaManager } = createSchemaManager();
    const engine = new DiagnosticValidationEngine(schemaManager, 5000);

    const result = await engine.validateText('page:\n  title: [', 'main');

    assert.strictEqual(typeof result.errorMessage, 'string');
    assert.strictEqual(result.errors, null);
  });

  it('uses schema kind specific loaders and cache', async () => {
    const { schemaManager, getCallCounts } = createSchemaManager();
    const engine = new DiagnosticValidationEngine(schemaManager, 5000);

    await engine.validateText('theme: {}', 'theme');
    await engine.validateText('theme: {}', 'theme');

    const counts = getCallCounts();
    assert.strictEqual(counts.themeCalls, 1);
    assert.strictEqual(counts.mainCalls, 0);
    assert.strictEqual(counts.templateCalls, 0);

    engine.clearCache();
    await engine.validateText('theme: {}', 'theme');

    const afterClearCounts = getCallCounts();
    assert.strictEqual(afterClearCounts.themeCalls, 2);
  });
});
