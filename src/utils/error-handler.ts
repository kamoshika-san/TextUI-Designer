import * as vscode from 'vscode';
import { logger } from './logger';

/**
 * エラーハンドリング設定
 */
export interface ErrorHandlingConfig {
  /** エラーを再スローするかどうか */
  rethrow?: boolean;
}

/**
 * エラーハンドリングユーティリティ
 */
export class ErrorHandler {
  /**
   * 統一的な非同期エラーハンドリング
   */
  static async withErrorHandling<T>(
    operation: () => Promise<T>, 
    context: string, 
    defaultValueOrConfig?: T | ErrorHandlingConfig,
    config?: ErrorHandlingConfig
  ): Promise<T> {
    // 引数の解析: 第3引数が設定オブジェクトか、デフォルト値かを判定
    let defaultValue: T | undefined;
    let errorConfig: ErrorHandlingConfig = {};
    
    if (config !== undefined) {
      // 4引数バージョン: defaultValue, config
      defaultValue = defaultValueOrConfig as T;
      errorConfig = config;
    } else if (defaultValueOrConfig !== undefined && defaultValueOrConfig !== null && typeof defaultValueOrConfig === 'object' && 'rethrow' in defaultValueOrConfig) {
      // 3引数バージョン: config のみ
      errorConfig = defaultValueOrConfig as ErrorHandlingConfig;
    } else {
      // 3引数バージョン: defaultValue のみ
      defaultValue = defaultValueOrConfig as T;
    }

    try {
      return await operation();
    } catch (error) {
      this.logError(error, context);
      this.showUserFriendlyError(error, context);
      
      if (errorConfig.rethrow) {
        throw error;
      }
      
      return defaultValue as T;
    }
  }

  /**
   * 統一的な同期エラーハンドリング
   */
  static withErrorHandlingSync<T>(
    operation: () => T, 
    context: string, 
    defaultValueOrConfig?: T | ErrorHandlingConfig,
    config?: ErrorHandlingConfig
  ): T {
    // 引数の解析: 第3引数が設定オブジェクトか、デフォルト値かを判定
    let defaultValue: T | undefined;
    let errorConfig: ErrorHandlingConfig = {};
    
    if (config !== undefined) {
      // 4引数バージョン: defaultValue, config
      defaultValue = defaultValueOrConfig as T;
      errorConfig = config;
    } else if (defaultValueOrConfig !== undefined && defaultValueOrConfig !== null && typeof defaultValueOrConfig === 'object' && 'rethrow' in defaultValueOrConfig) {
      // 3引数バージョン: config のみ
      errorConfig = defaultValueOrConfig as ErrorHandlingConfig;
    } else {
      // 3引数バージョン: defaultValue のみ
      defaultValue = defaultValueOrConfig as T;
    }

    try {
      return operation();
    } catch (error) {
      this.logError(error, context);
      this.showUserFriendlyError(error, context);
      
      if (errorConfig.rethrow) {
        throw error;
      }
      
      return defaultValue as T;
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