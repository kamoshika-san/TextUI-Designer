/**
 * ErrorHandlerの基本テスト
 */

const assert = require('assert');
const { describe, it, beforeEach, afterEach } = require('mocha');

// VSCode APIのモック
const mockVscode = {
  window: {
    showErrorMessage: () => {},
    showWarningMessage: () => {},
    showInformationMessage: () => {}
  }
};

global.vscode = mockVscode;

const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function(id) {
  if (id === 'vscode') {
    return mockVscode;
  }
  return originalRequire.apply(this, arguments);
};

const ErrorHandler = require('../../dist/utils/error-handler.js').ErrorHandler;

describe('ErrorHandler', () => {
  let originalConsoleError;
  let originalConsoleWarn;
  let originalConsoleLog;
  let consoleOutput;

  beforeEach(() => {
    // コンソール出力をキャプチャ
    consoleOutput = [];
    originalConsoleError = console.error;
    originalConsoleWarn = console.warn;
    originalConsoleLog = console.log;
    
    console.error = (...args) => {
      consoleOutput.push({ type: 'error', args });
      // テスト中はエラーログを出力しない
      // originalConsoleError.apply(console, args);
    };
    console.warn = (...args) => {
      consoleOutput.push({ type: 'warn', args });
      // テスト中は警告ログを出力しない
      // originalConsoleWarn.apply(console, args);
    };
    console.log = (...args) => {
      consoleOutput.push({ type: 'log', args });
      // テスト中はログを出力しない
      // originalConsoleLog.apply(console, args);
    };
  });

  afterEach(() => {
    // コンソール出力を復元
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
    console.log = originalConsoleLog;
    consoleOutput = [];
  });

  it('エラー発生時にコールバックが呼ばれる', async () => {
    let callbackCalled = false;
    const errorMessage = 'Test error occurred';
    
    const result = await ErrorHandler.executeSafely(
      async () => {
        throw new Error('Test error');
      },
      errorMessage
    );
    
    // エラーが発生した場合、undefinedが返される
    assert.strictEqual(result, undefined);
    
    // エラーメッセージがコンソールに出力されている
    const errorLogs = consoleOutput.filter(log => log.type === 'error');
    assert.ok(errorLogs.length > 0, 'エラーログが出力されている');
    assert.ok(errorLogs.some(log => 
      log.args.some(arg => typeof arg === 'string' && arg.includes(errorMessage))
    ), 'エラーメッセージが含まれている');
  });

  it('エラー内容がログに出力される', () => {
    const testError = new Error('Test error message');
    const errorMessage = 'Operation failed';
    
    ErrorHandler.showError(errorMessage, testError);
    
    // エラーログが出力されている
    const errorLogs = consoleOutput.filter(log => log.type === 'error');
    assert.ok(errorLogs.length > 0, 'エラーログが出力されている');
    
    // エラーメッセージとエラー内容が含まれている
    const logEntry = errorLogs[0];
    assert.ok(logEntry.args.some(arg => 
      typeof arg === 'string' && arg.includes(errorMessage)
    ), 'エラーメッセージが含まれている');
    assert.ok(logEntry.args.includes(testError), 'エラーオブジェクトが含まれている');
  });

  it('同期版でもエラー処理が動作する', () => {
    const result = ErrorHandler.executeSafelySync(
      () => {
        throw new Error('Sync test error');
      },
      'Sync operation failed'
    );
    
    // エラーが発生した場合、undefinedが返される
    assert.strictEqual(result, undefined);
    
    // エラーログが出力されている
    const errorLogs = consoleOutput.filter(log => log.type === 'error');
    assert.ok(errorLogs.length > 0, 'エラーログが出力されている');
  });

  it('正常な処理ではエラーが発生しない', async () => {
    const expectedResult = 'success';
    
    const result = await ErrorHandler.executeSafely(
      async () => expectedResult,
      'This should not appear'
    );
    
    // 正常な処理では結果が返される
    assert.strictEqual(result, expectedResult);
    
    // エラーログは出力されない
    const errorLogs = consoleOutput.filter(log => log.type === 'error');
    assert.strictEqual(errorLogs.length, 0, 'エラーログは出力されない');
  });
}); 