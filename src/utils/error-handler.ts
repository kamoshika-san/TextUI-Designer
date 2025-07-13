import * as vscode from 'vscode';
import { logger } from './logger';

/**
 * エラーハンドリングオプション
 */
interface ErrorHandlingOptions {
  errorMessage?: string;
  successMessage?: string;
  rethrow?: boolean;
  fallback?: any;
  logLevel?: 'error' | 'warn' | 'info' | 'debug';
  showToUser?: boolean;
  errorCode?: string;
}

/**
 * エラーハンドリングユーティリティ (元のシンプル実装)
 */
export class ErrorHandler {
  /**
   * 統一的な非同期エラーハンドリング
   */
  static async withErrorHandling<T>(
    operation: () => Promise<T>, 
    context: string, 
    defaultValueOrOptions?: T | ErrorHandlingOptions,
    options?: ErrorHandlingOptions
  ): Promise<T> {
    // パラメータの正規化
    let defaultValue: T | undefined;
    let errorOptions: ErrorHandlingOptions = {};
    
    if (typeof defaultValueOrOptions === 'object' && defaultValueOrOptions !== null && 'rethrow' in defaultValueOrOptions) {
      // 第3引数がオプションオブジェクトの場合
      errorOptions = defaultValueOrOptions as ErrorHandlingOptions;
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
      return fallback !== undefined ? fallback : (defaultValue as T);
    }
  }

  /**
   * 統一的な同期エラーハンドリング
   */
  static withErrorHandlingSync<T>(
    operation: () => T,
    options: ErrorHandlingOptions = {}
  ): T | null {
    const {
      errorMessage = '操作の実行に失敗しました',
      successMessage,
      rethrow = false,
      fallback,
      logLevel = 'error',
      showToUser = true,
      errorCode
    } = options;

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
      return fallback !== undefined ? fallback : null;
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