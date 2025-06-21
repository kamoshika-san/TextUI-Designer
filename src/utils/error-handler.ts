import * as vscode from 'vscode';

/**
 * エラーハンドリングユーティリティ
 */
export class ErrorHandler {
  /**
   * エラーメッセージを表示
   */
  static showError(message: string, error?: unknown): void {
    const errorMessage = error ? `${message}: ${this.formatError(error)}` : message;
    vscode.window.showErrorMessage(errorMessage);
    console.error(errorMessage, error);
  }

  /**
   * 警告メッセージを表示
   */
  static showWarning(message: string): void {
    vscode.window.showWarningMessage(message);
    console.warn(message);
  }

  /**
   * 情報メッセージを表示
   */
  static showInfo(message: string): void {
    vscode.window.showInformationMessage(message);
    console.log(message);
  }

  /**
   * エラーを安全に実行
   */
  static async executeSafely<T>(
    operation: () => Promise<T>,
    errorMessage: string
  ): Promise<T | undefined> {
    try {
      return await operation();
    } catch (error) {
      this.showError(errorMessage, error);
      return undefined;
    }
  }

  /**
   * エラーを安全に実行（同期版）
   */
  static executeSafelySync<T>(
    operation: () => T,
    errorMessage: string
  ): T | undefined {
    try {
      return operation();
    } catch (error) {
      this.showError(errorMessage, error);
      return undefined;
    }
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