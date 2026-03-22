/**
 * DiagnosticManager の依存注入（T-209）
 * scheduler / validationEngine / diagnosticCollection をモックに差し替え可能であることを検証する
 */

const assert = require('assert');
const { describe, it, afterEach } = require('mocha');

describe('DiagnosticManager DI (T-209)', () => {
  let restoreRequire;

  afterEach(() => {
    if (restoreRequire) {
      restoreRequire();
      restoreRequire = null;
    }
  });

  it('注入した scheduler / validationEngine / diagnosticCollection が使われる', async () => {
    const Module = require('module');
    const originalRequire = Module.prototype.require;
    const vscode = require('../mocks/vscode-mock.js');

    Module.prototype.require = function (id) {
      if (id === 'vscode') {
        return vscode;
      }
      return originalRequire.apply(this, arguments);
    };
    restoreRequire = () => {
      Module.prototype.require = originalRequire;
    };

    const diagnosticManagerPath = require.resolve('../../out/services/diagnostic-manager.js');
    delete require.cache[diagnosticManagerPath];
    const { DiagnosticManager } = require(diagnosticManagerPath);

    const mockSchemaManager = {
      loadSchema: async () => ({
        type: 'object',
        additionalProperties: false,
        properties: {
          page: {
            type: 'object',
            additionalProperties: false,
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              layout: { type: 'string', enum: ['vertical', 'horizontal'] }
            },
            required: ['id', 'title', 'layout']
          }
        },
        required: ['page']
      })
    };

    let scheduleCalls = 0;
    const mockScheduler = {
      schedule: (task) => {
        scheduleCalls += 1;
        void task();
      },
      clear: () => {}
    };

    let validateCalls = 0;
    const mockEngine = {
      validateText: async () => {
        validateCalls += 1;
        return { schema: null, errors: null, errorMessage: null };
      },
      clearCache: () => {}
    };

    const setCalls = { count: 0 };
    const mockCollection = {
      set: () => {
        setCalls.count += 1;
      },
      delete: () => {},
      clear: () => {},
      dispose: () => {}
    };

    const dm = new DiagnosticManager(mockSchemaManager, {
      scheduler: mockScheduler,
      validationEngine: mockEngine,
      diagnosticCollection: mockCollection
    });

    const document = {
      uri: vscode.Uri.file('/test/di-test.tui.yml'),
      getText: () =>
        ['page:', '  id: x', '  title: "t"', '  layout: vertical'].join('\n'),
      fileName: '/test/di-test.tui.yml',
      languageId: 'yaml',
      version: 1
    };

    await dm.validateAndReportDiagnostics(document);
    await new Promise((r) => setTimeout(r, 50));

    assert.strictEqual(scheduleCalls, 1, '注入スケジューラが1回使われる');
    assert.ok(validateCalls >= 1, '注入検証エンジンが呼ばれる');
    assert.ok(setCalls.count >= 1, '注入コレクションへ set される');

    dm.dispose();
  });
});
