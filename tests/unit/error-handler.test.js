/**
 * ErrorHandlerの基本テスト
 */

const assert = require('assert');
const path = require('path');

// セットアップファイルを読み込み
require('../setup.js');

describe('ErrorHandler', function() {
  let ErrorHandler;
  let vscode;
  let consoleOutput;

  beforeEach(function() {
    // モックをクリーンアップ（ファクトリをグローバルに再設定）
    global.cleanupMocks();
    
    // vscodeモックを作成
    vscode = {
      window: {
        showErrorMessage: (...args) => {
          consoleOutput.push({ type: 'error', args });
        },
        showWarningMessage: (...args) => {
          consoleOutput.push({ type: 'warn', args });
        },
        showInformationMessage: (...args) => {
          consoleOutput.push({ type: 'info', args });
        }
      }
    };
    
    if (!global.ErrorHandlerFactory || typeof global.ErrorHandlerFactory.createForTest !== 'function') {
      throw new Error('Global ErrorHandlerFactory or createForTest method is not available');
    }
    
    // テスト用のErrorHandlerを作成
    ErrorHandler = global.ErrorHandlerFactory.createForTest(vscode);
    
    // コンソール出力をキャプチャ
    consoleOutput = [];
  });

  afterEach(function() {
    // テスト後のクリーンアップ
    global.cleanupMocks();
  });

  it('withErrorHandling - デフォルト動作（エラーをキャッチしてログに記録）', async function() {
    const result = await ErrorHandler.withErrorHandling(
      async () => {
        throw new Error('Test error');
      },
      'TestOperation'
    );
    
    // エラーが発生した場合、undefinedが返される
    assert.strictEqual(result, undefined);
    
    // エラーが記録されている
    const errors = ErrorHandler.getErrors();
    assert.ok(errors.length > 0, 'エラーが記録されている');
  });

  it('withErrorHandling - デフォルト値を指定した場合', async function() {
    const defaultValue = 'default';
    const result = await ErrorHandler.withErrorHandling(
      async () => {
        throw new Error('Test error');
      },
      'TestOperation',
      defaultValue
    );
    
    // エラーが発生した場合、デフォルト値が返される
    assert.strictEqual(result, defaultValue);
  });

  it('withErrorHandling - rethrowオプションでエラーを再スロー', async function() {
    let errorCaught = false;
    
    try {
      await ErrorHandler.withErrorHandling(
        async () => {
          throw new Error('Critical error');
        },
        'CriticalOperation',
        { rethrow: true }
      );
    } catch (error) {
      errorCaught = true;
      assert.strictEqual(error.message, 'Critical error');
    }
    
    // エラーが再スローされている
    assert.strictEqual(errorCaught, true);
  });

  it('withErrorHandling - 正常な処理では結果が返される', async function() {
    const expectedResult = 'success';
    
    const result = await ErrorHandler.withErrorHandling(
      async () => expectedResult,
      'NormalOperation'
    );
    
    // 正常な処理では結果が返される
    assert.strictEqual(result, expectedResult);
    
    // エラーは記録されない
    const errors = ErrorHandler.getErrors();
    assert.strictEqual(errors.length, 0, 'エラーは記録されない');
  });

  it('withErrorHandlingSync - 同期版のエラーハンドリング', function() {
    const result = ErrorHandler.withErrorHandlingSync(
      () => {
        throw new Error('Sync test error');
      },
      {
        errorMessage: 'Sync operation failed',
        rethrow: false
      }
    );
    
    // エラーが発生した場合、nullが返される
    assert.strictEqual(result, null);
    
    // エラーが記録されている
    const errors = ErrorHandler.getErrors();
    assert.ok(errors.length > 0, 'エラーが記録されている');
  });

  it('withErrorHandlingSync - rethrowオプションでエラーを再スロー', function() {
    let errorCaught = false;
    
    try {
      ErrorHandler.withErrorHandlingSync(
        () => {
          throw new Error('Critical sync error');
        },
        {
          errorMessage: 'Critical sync operation failed',
          rethrow: true
        }
      );
    } catch (error) {
      errorCaught = true;
      assert.strictEqual(error.message, 'Critical sync error');
    }
    
    // エラーが再スローされている
    assert.strictEqual(errorCaught, true);
  });

  it('showError - エラーメッセージを表示', function() {
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

  it('showWarning - 警告メッセージを表示', function() {
    const warningMessage = 'This is a warning';
    
    ErrorHandler.showWarning(warningMessage);
    
    // 警告が記録されている
    const errors = ErrorHandler.getErrors();
    const warningEntry = errors.find(error => error.level === 'warning');
    assert.ok(warningEntry, '警告エントリが存在する');
    assert.strictEqual(warningEntry.message, warningMessage, '警告メッセージが正しい');
  });

  it('showInfo - 情報メッセージを表示', function() {
    const infoMessage = 'This is info';
    
    ErrorHandler.showInfo(infoMessage);
    
    // 情報メッセージは正常に処理される
    assert.ok(true, 'showInfoメソッドが正常に実行される');
  });
}); 