/**
 * テスト専用ErrorHandlerファクトリ
 */

class TestErrorHandler {
  constructor() {
    this.errors = [];
    this.outputChannel = (global.vscode && global.vscode.window && global.vscode.window.createOutputChannel)
      ? global.vscode.window.createOutputChannel('TextUI Designer')
      : {
          appendLine: () => {},
          show: () => {},
          showErrorMessage: () => {},
          showWarningMessage: () => {},
          clear: () => {}
        };
  }

  /**
   * エラーをログに記録
   */
  static logError(error, context = '') {
    const instance = TestErrorHandler._getInstance();
    const errorInfo = {
      message: error.message || error,
      context,
      timestamp: new Date().toISOString(),
      stack: error.stack
    };
    
    instance.errors.push(errorInfo);
    instance.outputChannel.appendLine(`[ERROR] ${context}: ${errorInfo.message}`);
    
    return errorInfo;
  }

  /**
   * 警告をログに記録
   */
  static logWarning(message, context = '') {
    const instance = TestErrorHandler._getInstance();
    const warningInfo = {
      message,
      context,
      timestamp: new Date().toISOString(),
      level: 'warning'
    };
    
    instance.errors.push(warningInfo);
    instance.outputChannel.appendLine(`[WARNING] ${context}: ${message}`);
    
    return warningInfo;
  }

  /**
   * 情報をログに記録
   */
  static logInfo(message, context = '') {
    const instance = TestErrorHandler._getInstance();
    const infoLog = {
      message,
      context,
      timestamp: new Date().toISOString(),
      level: 'info'
    };
    
    instance.outputChannel.appendLine(`[INFO] ${context}: ${message}`);
    
    return infoLog;
  }

  /**
   * エラーを表示
   */
  static showError(message, actions = []) {
    const instance = TestErrorHandler._getInstance();
    instance.outputChannel.showErrorMessage(message, ...actions);
    return TestErrorHandler.logError(new Error(message), 'showError');
  }

  /**
   * 警告を表示
   */
  static showWarning(message, actions = []) {
    const instance = TestErrorHandler._getInstance();
    instance.outputChannel.showWarningMessage(message, ...actions);
    return TestErrorHandler.logWarning(message, 'showWarning');
  }

  /**
   * 安全に関数を実行（非同期版）
   */
  static async executeSafely(fn, context = '', errorCallback = null) {
    try {
      return await fn();
    } catch (error) {
      TestErrorHandler.logError(error, context);
      if (errorCallback) {
        errorCallback(error);
      }
      return null;
    }
  }

  /**
   * 安全に関数を実行（同期版）
   */
  static executeSafelySync(fn, context = '', errorCallback = null) {
    try {
      return fn();
    } catch (error) {
      TestErrorHandler.logError(error, context);
      if (errorCallback) {
        errorCallback(error);
      }
      return null;
    }
  }

  /**
   * 記録されたエラーを取得
   */
  static getErrors() {
    const instance = TestErrorHandler._getInstance();
    return instance.errors;
  }

  /**
   * エラーログをクリア
   */
  static clearErrors() {
    const instance = TestErrorHandler._getInstance();
    instance.errors = [];
    instance.outputChannel.clear();
  }

  /**
   * シングルトンインスタンスを取得
   */
  static _getInstance() {
    if (!TestErrorHandler._instance) {
      TestErrorHandler._instance = new TestErrorHandler();
    }
    return TestErrorHandler._instance;
  }

  /**
   * インスタンスをリセット
   */
  static reset() {
    TestErrorHandler._instance = null;
  }

  /**
   * テスト用にインスタンスを設定
   */
  static _setInstance(instance) {
    TestErrorHandler._instance = instance;
  }
}

TestErrorHandler._instance = null;

/**
 * ErrorHandlerファクトリ
 */
class ErrorHandlerFactory {
  /**
   * テスト用ErrorHandlerを作成
   */
  static createForTest(mockVscode) {
    const instance = new TestErrorHandler(mockVscode);
    TestErrorHandler._setInstance(instance);
    return TestErrorHandler;
  }

  /**
   * 本番用ErrorHandlerを取得
   */
  static createForProduction() {
    try {
      return require('../../out/utils/error-handler.js').ErrorHandler;
    } catch (error) {
      return TestErrorHandler;
    }
  }

  /**
   * 環境に応じたErrorHandlerを取得
   */
  static create() {
    if (process.env.NODE_ENV === 'test') {
      const mockVscode = require('./vscode-mock');
      return ErrorHandlerFactory.createForTest(mockVscode);
    } else {
      return ErrorHandlerFactory.createForProduction();
    }
  }
}

module.exports = {
  TestErrorHandler,
  ErrorHandlerFactory
}; 