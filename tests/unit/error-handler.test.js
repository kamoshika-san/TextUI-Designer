const assert = require('assert');
const path = require('path');

describe('ErrorHandler', () => {
  const errorHandlerPath = path.resolve(__dirname, '../../out/utils/error-handler.js');
  const loggerPath = path.resolve(__dirname, '../../out/utils/logger.js');
  const vscode = global.vscode;

  let ErrorHandler;
  let Logger;
  let originalLoggerWrite;
  let loggerWrites;
  let shownErrors;
  let shownWarnings;
  let shownInfos;
  let originalShowErrorMessage;
  let originalShowWarningMessage;
  let originalShowInformationMessage;

  beforeEach(() => {
    delete require.cache[errorHandlerPath];
    delete require.cache[loggerPath];

    ({ Logger } = require(loggerPath));
    loggerWrites = [];
    shownErrors = [];
    shownWarnings = [];
    shownInfos = [];

    originalLoggerWrite = Logger.prototype.write;
    Logger.prototype.write = function(level, message, ...args) {
      loggerWrites.push({ scope: this.scope, level, message, args });
    };

    originalShowErrorMessage = vscode.window.showErrorMessage;
    originalShowWarningMessage = vscode.window.showWarningMessage;
    originalShowInformationMessage = vscode.window.showInformationMessage;
    vscode.window.showErrorMessage = async (message) => {
      shownErrors.push(message);
      return undefined;
    };
    vscode.window.showWarningMessage = async (message) => {
      shownWarnings.push(message);
      return undefined;
    };
    vscode.window.showInformationMessage = async (message) => {
      shownInfos.push(message);
      return undefined;
    };

    ({ ErrorHandler } = require(errorHandlerPath));
  });

  afterEach(() => {
    Logger.prototype.write = originalLoggerWrite;

    vscode.window.showErrorMessage = originalShowErrorMessage;
    vscode.window.showWarningMessage = originalShowWarningMessage;
    vscode.window.showInformationMessage = originalShowInformationMessage;

    delete require.cache[errorHandlerPath];
    delete require.cache[loggerPath];
  });

  it('showError keeps the user-facing message compact and logs structured context', () => {
    const err = new Error('boom');
    err.name = 'ValidationError';
    err.stack = 'ValidationError: boom\n    at test';

    ErrorHandler.showError('Operation failed', err);

    assert.deepStrictEqual(shownErrors, ['Operation failed: boom']);
    assert.strictEqual(loggerWrites.length, 2);
    assert.strictEqual(loggerWrites[0].scope, 'ErrorHandler');
    assert.strictEqual(loggerWrites[0].level, 'error');
    assert.strictEqual(loggerWrites[0].message, 'Handled error');
    assert.deepStrictEqual(loggerWrites[0].args[0], {
      context: 'Operation failed',
      errorType: 'ValidationError',
      detail: 'boom'
    });
    assert.strictEqual(loggerWrites[1].message, 'Handled error stack:');
    assert.strictEqual(loggerWrites[1].args[0], 'ValidationError: boom\n    at test');
  });

  it('executeSafely returns undefined and preserves context for handled async failures', async () => {
    const err = new Error('async boom');
    err.stack = 'Error: async boom\n    at async test';

    const result = await ErrorHandler.executeSafely(async () => {
      throw err;
    }, 'Loading failed');

    assert.strictEqual(result, undefined);
    assert.deepStrictEqual(shownErrors, ['Loading failed: async boom']);
    assert.deepStrictEqual(loggerWrites[0].args[0], {
      context: 'Loading failed',
      errorType: 'Error',
      detail: 'async boom'
    });
    assert.strictEqual(loggerWrites[1].args[0], 'Error: async boom\n    at async test');
  });

  it('executeSafelySync preserves non-Error detail without widening the API', () => {
    const result = ErrorHandler.executeSafelySync(() => {
      throw 'sync boom';
    }, 'Sync failed');

    assert.strictEqual(result, undefined);
    assert.deepStrictEqual(shownErrors, ['Sync failed: sync boom']);
    assert.deepStrictEqual(loggerWrites[0].args[0], {
      context: 'Sync failed',
      detail: 'sync boom'
    });
    assert.strictEqual(loggerWrites.length, 1);
  });

  it('routes warning and info messages through the structured logger foundation', () => {
    ErrorHandler.showWarning('Heads up');
    ErrorHandler.showInfo('FYI');

    assert.deepStrictEqual(shownWarnings, ['Heads up']);
    assert.deepStrictEqual(shownInfos, ['FYI']);
    assert.strictEqual(loggerWrites.length, 2);
    assert.deepStrictEqual(
      loggerWrites.map((entry) => ({ scope: entry.scope, level: entry.level, message: entry.message })),
      [
        { scope: 'ErrorHandler', level: 'warn', message: 'Heads up' },
        { scope: 'ErrorHandler', level: 'info', message: 'FYI' }
      ]
    );
  });
});
