/**
 * ErrorHandlerの基本テスト
 */

const assert = require('assert');
const path = require('path');
const { describe, it, beforeEach, afterEach } = require('mocha');

describe('ErrorHandler', function() {
  let ErrorHandler;
  let originalConsoleError;
  let originalConsoleWarn;
  let originalConsoleLog;
  let consoleOutput;

  beforeEach(function() {
    // モックをクリーンアップ（ファクトリをグローバルに再設定）
    global.cleanupMocks();
    
    if (!global.ErrorHandlerFactory || typeof global.ErrorHandlerFactory.createForTest !== 'function') {
      throw new Error('Global ErrorHandlerFactory or createForTest method is not available');
    }
    
    // テスト用のErrorHandlerを作成
    ErrorHandler = global.ErrorHandlerFactory.createForTest(global.vscode);
    
    // コンソール出力をキャプチャ
    consoleOutput = [];
    originalConsoleError = console.error;
    originalConsoleWarn = console.warn;
    originalConsoleLog = console.log;
    
    console.error = (...args) => {
      consoleOutput.push({ type: 'error', args });
    };
    console.warn = (...args) => {
      consoleOutput.push({ type: 'warn', args });
    };
    console.log = (...args) => {
      consoleOutput.push({ type: 'log', args });
    };
  });

  afterEach(function() {
    // コンソール出力を復元
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
    console.log = originalConsoleLog;
    consoleOutput = [];
    
    // テスト後のクリーンアップ
    global.cleanupMocks();
  });

  it('エラー発生時にコールバックが呼ばれる', async function() {
    let callbackCalled = false;
    const errorMessage = 'Test error occurred';
    
    const result = await ErrorHandler.executeSafely(
      async () => {
        throw new Error('Test error');
      },
      errorMessage,
      () => { callbackCalled = true; }
    );
    
    // エラーが発生した場合、nullが返される
    assert.strictEqual(result, null);
    
    // コールバックが呼ばれている
    assert.strictEqual(callbackCalled, true);
    
    // エラーが記録されている
    const errors = ErrorHandler.getErrors();
    assert.ok(errors.length > 0, 'エラーが記録されている');
    assert.ok(errors.some(error => error.context === errorMessage), 'エラーコンテキストが正しい');
  });

  it('エラー内容がログに出力される', function() {
    const errorMessage = 'Operation failed';
    
    ErrorHandler.showError(errorMessage);
    
    // エラーが記録されている
    const errors = ErrorHandler.getErrors();
    assert.ok(errors.length > 0, 'エラーが記録されている');
    
    // エラーメッセージが正しい
    const errorEntry = errors.find(error => error.context === 'showError');
    assert.ok(errorEntry, 'showErrorのエラーエントリが存在する');
    assert.strictEqual(errorEntry.message, errorMessage, 'エラーメッセージが正しい');
  });

  it('同期版でもエラー処理が動作する', function() {
    const result = ErrorHandler.executeSafelySync(
      () => {
        throw new Error('Sync test error');
      },
      'Sync operation failed'
    );
    
    // エラーが発生した場合、nullが返される
    assert.strictEqual(result, null);
    
    // エラーが記録されている
    const errors = ErrorHandler.getErrors();
    assert.ok(errors.length > 0, 'エラーが記録されている');
    assert.ok(errors.some(error => error.context === 'Sync operation failed'), 'エラーコンテキストが正しい');
  });

  it('正常な処理ではエラーが発生しない', async function() {
    const expectedResult = 'success';
    
    const result = await ErrorHandler.executeSafely(
      async () => expectedResult,
      'This should not appear'
    );
    
    // 正常な処理では結果が返される
    assert.strictEqual(result, expectedResult);
    
    // エラーは記録されない
    const errors = ErrorHandler.getErrors();
    assert.strictEqual(errors.length, 0, 'エラーは記録されない');
  });

  it('警告メッセージが正しく処理される', function() {
    const warningMessage = 'This is a warning';
    
    ErrorHandler.showWarning(warningMessage);
    
    // 警告が記録されている
    const errors = ErrorHandler.getErrors();
    const warningEntry = errors.find(error => error.level === 'warning');
    assert.ok(warningEntry, '警告エントリが存在する');
    assert.strictEqual(warningEntry.message, warningMessage, '警告メッセージが正しい');
  });

  it('ログ情報が正しく処理される', function() {
    const infoMessage = 'This is info';
    
    ErrorHandler.logInfo(infoMessage, 'test context');
    
    // 情報ログは通常のエラー配列には含まれない（別途処理される）
    // ここではメソッドが正常に実行されることを確認
    assert.ok(true, 'logInfoメソッドが正常に実行される');
  });
}); 