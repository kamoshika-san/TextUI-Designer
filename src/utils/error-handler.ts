import * as vscode from 'vscode';
import { logger } from './logger';

/**
 * エラーハンドリングオプション
 */
export interface ErrorHandlingOptions {
  /** エラーメッセージ */
  errorMessage?: string;
  /** 成功メッセージ */
  successMessage?: string;
  /** エラー時に例外を再スローするか */
  rethrow?: boolean;
  /** エラー時のフォールバック処理 */
  fallback?: () => Promise<void> | void;
  /** ログレベル */
  logLevel?: 'error' | 'warn' | 'info' | 'debug';
  /** ユーザーに通知するか */
  showToUser?: boolean;
  /** エラーコード */
  errorCode?: string;
}

/**
 * エラー情報
 */
export interface ErrorInfo {
  message: string;
  code?: string;
  details?: unknown;
  timestamp: number;
  context?: string;
}

/**
 * 統一エラーハンドリングシステム
 * DRY原則に従ったエラー処理を提供
 */
export class ErrorHandler {
  private static errorHistory: ErrorInfo[] = [];
  private static maxHistorySize = 100;

  /**
   * エラーハンドリング付きで非同期処理を実行
   */
  static async withErrorHandling<T>(
    operation: () => Promise<T>,
    options: ErrorHandlingOptions = {}
  ): Promise<T | null> {
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
      const result = await operation();
      
      if (successMessage) {
        this.showInfo(successMessage);
      }
      
      return result;
    } catch (error) {
      const errorInfo: ErrorInfo = {
        message: errorMessage,
        code: errorCode,
        details: error,
        timestamp: Date.now(),
        context: this.getCallerContext()
      };

      this.logError(errorInfo, logLevel);
      this.addToHistory(errorInfo);

      if (showToUser) {
        this.showError(errorMessage, error);
      }

      if (fallback) {
        try {
          await fallback();
        } catch (fallbackError) {
          logger.error('フォールバック処理でエラーが発生しました:', fallbackError);
        }
      }

      if (rethrow) {
        throw error;
      }

      return null;
    }
  }

  /**
   * エラーハンドリング付きで同期処理を実行
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
        this.showInfo(successMessage);
      }
      
      return result;
    } catch (error) {
      const errorInfo: ErrorInfo = {
        message: errorMessage,
        code: errorCode,
        details: error,
        timestamp: Date.now(),
        context: this.getCallerContext()
      };

      this.logError(errorInfo, logLevel);
      this.addToHistory(errorInfo);

      if (showToUser) {
        this.showError(errorMessage, error);
      }

      if (fallback) {
        try {
          fallback();
        } catch (fallbackError) {
          logger.error('フォールバック処理でエラーが発生しました:', fallbackError);
        }
      }

      if (rethrow) {
        throw error;
      }

      return null;
    }
  }

  /**
   * エラーをログに記録
   */
  private static logError(errorInfo: ErrorInfo, level: string): void {
    const logMessage = `[${errorInfo.code || 'ERROR'}] ${errorInfo.message}`;
    const details = errorInfo.details instanceof Error 
      ? `${errorInfo.details.message}\n${errorInfo.details.stack}`
      : errorInfo.details;

    switch (level) {
      case 'error':
        logger.error(logMessage, details);
        break;
      case 'warn':
        logger.warn(logMessage, details);
        break;
      case 'info':
        logger.info(logMessage, details);
        break;
      case 'debug':
        logger.debug(logMessage, details);
        break;
    }
  }

  /**
   * エラー履歴に追加
   */
  private static addToHistory(errorInfo: ErrorInfo): void {
    this.errorHistory.push(errorInfo);
    
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory.shift();
    }
  }

  /**
   * エラーをユーザーに表示
   */
  static showError(message: string, error?: unknown): void {
    const fullMessage = error instanceof Error 
      ? `${message}: ${error.message}`
      : message;
    
    vscode.window.showErrorMessage(fullMessage);
  }

  /**
   * 情報をユーザーに表示
   */
  static showInfo(message: string): void {
    vscode.window.showInformationMessage(message);
  }

  /**
   * 警告をユーザーに表示
   */
  static showWarning(message: string): void {
    vscode.window.showWarningMessage(message);
  }

  /**
   * 呼び出し元のコンテキストを取得
   */
  private static getCallerContext(): string {
    const stack = new Error().stack;
    if (!stack) return 'unknown';
    
    const lines = stack.split('\n');
    // 最初の3行をスキップ（Error, withErrorHandling, 呼び出し元）
    const callerLine = lines[3];
    return callerLine ? callerLine.trim() : 'unknown';
  }

  /**
   * エラー履歴を取得
   */
  static getErrorHistory(): ErrorInfo[] {
    return [...this.errorHistory];
  }

  /**
   * エラー履歴をクリア
   */
  static clearErrorHistory(): void {
    this.errorHistory = [];
  }

  /**
   * エラー統計を取得
   */
  static getErrorStats(): {
    totalErrors: number;
    errorsByCode: Record<string, number>;
    recentErrors: number;
  } {
    const errorsByCode: Record<string, number> = {};
    const recentErrors = this.errorHistory.filter(
      error => Date.now() - error.timestamp < 24 * 60 * 60 * 1000 // 24時間以内
    ).length;

    this.errorHistory.forEach(error => {
      const code = error.code || 'unknown';
      errorsByCode[code] = (errorsByCode[code] || 0) + 1;
    });

    return {
      totalErrors: this.errorHistory.length,
      errorsByCode,
      recentErrors
    };
  }
} 