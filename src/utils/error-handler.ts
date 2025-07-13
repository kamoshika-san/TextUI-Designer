import * as vscode from 'vscode';
import { logger } from './logger';

/**
 * エラーハンドリングオプション
 */
interface ErrorHandlingOptions<T = any> {
  errorMessage?: string;
  successMessage?: string;
  rethrow?: boolean;
  fallback?: T | null;
  logLevel?: 'error' | 'warn' | 'info' | 'debug';
  showToUser?: boolean;
  errorCode?: string;
}

/**
 * エラーハンドリングユーティリティ (修正版)
 */
export class ErrorHandler {
  /**
   * オプションオブジェクトかどうかを判定する型ガード (簡素化版)
   */
  private static isErrorHandlingOptions<T>(value: any): value is ErrorHandlingOptions<T> {
    if (typeof value !== 'object' || value === null) {
      return false;
    }
    
    // ErrorHandlingOptionsの特定のプロパティが存在するかチェック
    const optionKeys = ['errorMessage', 'successMessage', 'rethrow', 'fallback', 'logLevel', 'showToUser', 'errorCode'];
    
    // 少なくとも1つのオプションキーが存在し、その値が適切な型であることを確認
    const hasValidOption = optionKeys.some(key => {
      if (!(key in value)) return false;
      const optionValue = value[key];
      
      switch (key) {
        case 'errorMessage':
        case 'successMessage':
        case 'errorCode':
          return typeof optionValue === 'string' || optionValue === undefined;
        case 'rethrow':
        case 'showToUser':
          return typeof optionValue === 'boolean' || optionValue === undefined;
        case 'logLevel':
          return ['error', 'warn', 'info', 'debug'].includes(optionValue) || optionValue === undefined;
        case 'fallback':
          return true; // fallbackは任意の型を許可
        default:
          return false;
      }
    });
    
    return hasValidOption;
  }

  /**
   * 統一的な非同期エラーハンドリング (オーバーロード)
   */
  // void型の場合のオーバーロード
  static async withErrorHandling(
    operation: () => Promise<void>,
    context: string,
    options?: ErrorHandlingOptions<void>
  ): Promise<void>;
  
  // 非void型の場合のオーバーロード
  static async withErrorHandling<T>(
    operation: () => Promise<T>,
    context: string,
    defaultValueOrOptions?: T | ErrorHandlingOptions<T>,
    options?: ErrorHandlingOptions<T>
  ): Promise<T | null>;
  
  // 実装
  static async withErrorHandling<T>(
    operation: () => Promise<T>,
    context: string,
    defaultValueOrOptions?: T | ErrorHandlingOptions<T>,
    options?: ErrorHandlingOptions<T>
  ): Promise<T | null> {
    // パラメータの正規化
    let defaultValue: T | undefined;
    let errorOptions: ErrorHandlingOptions<T> = {};
    
    if (this.isErrorHandlingOptions<T>(defaultValueOrOptions)) {
      // 第3引数がオプションオブジェクトの場合
      errorOptions = defaultValueOrOptions;
    } else {
      // 第3引数がデフォルト値の場合
      defaultValue = defaultValueOrOptions as T;
      errorOptions = options || {};
    }

    const {
      errorMessage = context,
      successMessage,
      rethrow = false,
      fallback,
      logLevel = 'error',
      showToUser = true,
      errorCode
    } = errorOptions;

    try {
      const result = await operation();
      
      if (successMessage) {
        logger.info(successMessage);
      }
      
      return result;
    } catch (error) {
      // エラーログを記録
      if (logLevel === 'error') {
        this.logError(error, errorMessage);
      } else if (logLevel === 'warn') {
        logger.warn(`${errorMessage}: ${this.formatError(error)}`);
      } else if (logLevel === 'info') {
        logger.info(`${errorMessage}: ${this.formatError(error)}`);
      } else if (logLevel === 'debug') {
        logger.debug(`${errorMessage}: ${this.formatError(error)}`);
      }

      // ユーザーにエラーを表示
      if (showToUser) {
        this.showUserFriendlyError(error, errorMessage);
      }

      // 例外を再スローするかどうか
      if (rethrow) {
        throw error;
      }

      // フォールバック値を返す
      return fallback !== undefined ? fallback as T : (defaultValue !== undefined ? defaultValue : null);
    }
  }

  /**
   * 統一的な同期エラーハンドリング (オーバーロード)
   */
  // void型の場合のオーバーロード
  static withErrorHandlingSync(
    operation: () => void,
    context: string,
    options?: ErrorHandlingOptions<void>
  ): void;
  
  // 非void型の場合のオーバーロード
  static withErrorHandlingSync<T>(
    operation: () => T,
    context: string,
    defaultValueOrOptions?: T | ErrorHandlingOptions<T>,
    options?: ErrorHandlingOptions<T>
  ): T | null;
  
  // 実装
  static withErrorHandlingSync<T>(
    operation: () => T,
    context: string,
    defaultValueOrOptions?: T | ErrorHandlingOptions<T>,
    options?: ErrorHandlingOptions<T>
  ): T | null {
    // パラメータの正規化
    let defaultValue: T | undefined;
    let errorOptions: ErrorHandlingOptions<T> = {};
    
    if (this.isErrorHandlingOptions<T>(defaultValueOrOptions)) {
      // 第3引数がオプションオブジェクトの場合
      errorOptions = defaultValueOrOptions;
    } else {
      // 第3引数がデフォルト値の場合
      defaultValue = defaultValueOrOptions as T;
      errorOptions = options || {};
    }

    const {
      errorMessage = context || '操作の実行に失敗しました',
      successMessage,
      rethrow = false,
      fallback,
      logLevel = 'error',
      showToUser = true,
      errorCode
    } = errorOptions;

    try {
      const result = operation();
      
      if (successMessage) {
        logger.info(successMessage);
      }
      
      return result;
    } catch (error) {
      // エラーログを記録
      if (logLevel === 'error') {
        this.logError(error, errorMessage);
      } else if (logLevel === 'warn') {
        logger.warn(`${errorMessage}: ${this.formatError(error)}`);
      } else if (logLevel === 'info') {
        logger.info(`${errorMessage}: ${this.formatError(error)}`);
      } else if (logLevel === 'debug') {
        logger.debug(`${errorMessage}: ${this.formatError(error)}`);
      }

      // ユーザーにエラーを表示
      if (showToUser) {
        this.showUserFriendlyError(error, errorMessage);
      }

      // 例外を再スローするかどうか
      if (rethrow) {
        throw error;
      }

      // フォールバック値を返す
      return fallback !== undefined ? fallback as T : (defaultValue !== undefined ? defaultValue : null);
    }
  }

  /**
   * エラーログを記録
   */
  static logError(error: unknown, context?: string): void {
    const msg = context ? `[${context}]` : '';
    if (error instanceof Error) {
      logger.error(`${msg} ${error.message}`, error.stack);
    } else {
      logger.error(`${msg} ${String(error)}`);
    }
  }

  /**
   * ユーザー向けエラーメッセージを表示
   */
  static showUserFriendlyError(error: unknown, context?: string): void {
    const baseMsg = context ? `${context}` : 'エラーが発生しました';
    let detail = '';
    if (error instanceof Error) {
      detail = error.message;
    } else if (typeof error === 'string') {
      detail = error;
    } else {
      detail = String(error);
    }
    vscode.window.showErrorMessage(`${baseMsg}: ${detail}`);
  }

  /**
   * 既存API: エラーメッセージを表示
   */
  static showError(message: string, error?: unknown): void {
    const errorMessage = error ? `${message}: ${this.formatError(error)}` : message;
    vscode.window.showErrorMessage(errorMessage);
    this.logError(error, message);
  }

  /**
   * 既存API: 警告メッセージを表示
   */
  static showWarning(message: string): void {
    vscode.window.showWarningMessage(message);
    logger.warn(message);
  }

  /**
   * 既存API: 情報メッセージを表示
   */
  static showInfo(message: string): void {
    vscode.window.showInformationMessage(message);
  }

  /**
   * エラーオブジェクトを文字列にフォーマット
   */
  private static formatError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    return String(error);
  }
} 