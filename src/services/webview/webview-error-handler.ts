import * as vscode from 'vscode';
import { WebViewLifecycleManager } from './webview-lifecycle-manager';
import { YamlErrorInfo, SchemaErrorInfo } from './yaml-parser';

export interface ErrorMessage {
  type: 'error' | 'parseError' | 'schemaError';
  message?: string;
  error?: any;
  fileName?: string;
  content?: string;
}

/**
 * WebViewエラー処理専用クラス
 * エラーメッセージの送信、エラー状態の管理、エラー情報の整形を担当
 */
export class WebViewErrorHandler {
  private lifecycleManager: WebViewLifecycleManager;
  private errorState: Map<string, any> = new Map(); // ファイル別エラー状態

  constructor(lifecycleManager: WebViewLifecycleManager) {
    this.lifecycleManager = lifecycleManager;
  }

  /**
   * 一般エラーメッセージを送信
   */
  sendErrorMessage(message: string): void {
    const errorMessage: ErrorMessage = {
      type: 'error',
      message: message
    };
    this.sendMessageToWebView(errorMessage);
  }

  /**
   * YAMLパースエラーを送信
   */
  sendParseError(error: Error, fileName: string, content: string): void {
    const errorDetails = this.extractParseErrorDetails(error);
    
    const errorMessage: ErrorMessage = {
      type: 'parseError',
      error: errorDetails,
      fileName: fileName,
      content: content
    };
    
    this.sendMessageToWebView(errorMessage);
    this.setErrorState(fileName, 'parse', errorDetails);
  }

  /**
   * スキーマエラーを送信
   */
  sendSchemaError(error: Error, fileName: string, content: string): void {
    const errorDetails = this.extractSchemaErrorDetails(error);
    
    const errorMessage: ErrorMessage = {
      type: 'schemaError',
      error: errorDetails,
      fileName: fileName,
      content: content
    };
    
    this.sendMessageToWebView(errorMessage);
    this.setErrorState(fileName, 'schema', errorDetails);
  }

  /**
   * ファイルサイズエラーを送信
   */
  sendFileSizeError(fileSize: number, fileName: string): void {
    const message = `YAMLファイルが大きすぎます（${Math.round(fileSize / 1024)}KB）。1MB以下にしてください。`;
    this.sendErrorMessage(message);
    this.setErrorState(fileName, 'size', { message, fileSize });
  }

  /**
   * エラー状態をクリア
   */
  clearErrorState(fileName?: string): void {
    if (fileName) {
      this.errorState.delete(fileName);
      console.log(`[WebViewErrorHandler] エラー状態をクリア: ${fileName}`);
    } else {
      this.errorState.clear();
      console.log('[WebViewErrorHandler] 全エラー状態をクリアしました');
    }
  }

  /**
   * エラー状態を取得
   */
  getErrorState(fileName: string): any | null {
    return this.errorState.get(fileName) || null;
  }

  /**
   * エラー状態があるかチェック
   */
  hasErrorState(fileName: string): boolean {
    return this.errorState.has(fileName);
  }

  /**
   * エラー統計を取得
   */
  getErrorStats(): {
    totalErrors: number;
    parseErrors: number;
    schemaErrors: number;
    sizeErrors: number;
  } {
    let parseErrors = 0;
    let schemaErrors = 0;
    let sizeErrors = 0;

    for (const [, errorInfo] of this.errorState.entries()) {
      if (errorInfo.type === 'parse') {parseErrors++;}
      else if (errorInfo.type === 'schema') {schemaErrors++;}
      else if (errorInfo.type === 'size') {sizeErrors++;}
    }

    return {
      totalErrors: this.errorState.size,
      parseErrors,
      schemaErrors,
      sizeErrors
    };
  }

  /**
   * エラーメッセージをWebViewに送信
   */
  private sendMessageToWebView(errorMessage: ErrorMessage): void {
    const panel = this.lifecycleManager.getPanel();
    if (!panel) {
      console.warn('[WebViewErrorHandler] WebViewパネルが存在しません');
      return;
    }

    try {
      panel.webview.postMessage(errorMessage);
      console.log(`[WebViewErrorHandler] エラーメッセージを送信: ${errorMessage.type}`);
    } catch (error) {
      console.error('[WebViewErrorHandler] エラーメッセージの送信に失敗しました:', error);
    }
  }

  /**
   * パースエラーの詳細を抽出
   */
  private extractParseErrorDetails(error: Error): YamlErrorInfo | null {
    if (error.name === 'YamlParseError' && (error as any).details) {
      return (error as any).details;
    }

    // フォールバック: エラーメッセージから情報を抽出
    const errorMessage = error.message || 'Unknown error';
    const lines = errorMessage.split('\n');
    
    // 行番号を抽出
    const lineMatch = errorMessage.match(/line (\d+)/i);
    const lineNumber = lineMatch ? parseInt(lineMatch[1]) : 1;
    
    return {
      message: errorMessage,
      line: lineNumber,
      column: 0,
      errorLine: lines[0] || '',
      suggestions: this.generateParseErrorSuggestions(errorMessage),
      fileName: 'unknown'
    };
  }

  /**
   * スキーマエラーの詳細を抽出
   */
  private extractSchemaErrorDetails(error: Error): SchemaErrorInfo | null {
    if (error.name === 'SchemaValidationError' && (error as any).details) {
      return (error as any).details;
    }

    // フォールバック: 基本的なエラー情報
    return {
      message: error.message || 'Unknown schema error',
      errors: [],
      suggestions: [],
      fileName: 'unknown'
    };
  }

  /**
   * パースエラー修正の提案を生成
   */
  private generateParseErrorSuggestions(errorMessage: string): string[] {
    const suggestions: string[] = [];
    
    if (errorMessage.includes('duplicate key')) {
      suggestions.push('重複したキーが存在します。キー名を確認してください。');
    } else if (errorMessage.includes('mapping values')) {
      suggestions.push('YAMLの構文エラーです。インデントとコロンの使用を確認してください。');
    } else if (errorMessage.includes('unexpected end')) {
      suggestions.push('YAMLファイルが不完全です。閉じ括弧やクォートを確認してください。');
    } else if (errorMessage.includes('invalid character')) {
      suggestions.push('無効な文字が含まれています。特殊文字やエンコーディングを確認してください。');
    } else if (errorMessage.includes('too large') || errorMessage.includes('大きすぎます')) {
      suggestions.push('ファイルサイズを1MB以下にしてください。');
    }
    
    return suggestions;
  }

  /**
   * エラー状態を設定
   */
  private setErrorState(fileName: string, type: string, details: any): void {
    this.errorState.set(fileName, {
      type: type,
      details: details,
      timestamp: Date.now()
    });
    console.log(`[WebViewErrorHandler] エラー状態を設定: ${fileName} (${type})`);
  }

  /**
   * エラー情報をログ出力
   */
  logError(error: Error, context: string): void {
    console.error(`[WebViewErrorHandler] ${context}:`, {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
  }

  /**
   * エラー情報をユーザーフレンドリーな形式に変換
   */
  formatErrorForUser(error: Error): string {
    if (error.name === 'YamlParseError') {
      return 'YAMLファイルの構文エラーが発生しました。';
    } else if (error.name === 'SchemaValidationError') {
      return 'スキーマ検証エラーが発生しました。';
    } else if (error.name === 'FileSizeError') {
      return 'ファイルサイズが制限を超えています。';
    } else {
      return '予期しないエラーが発生しました。';
    }
  }

  /**
   * テスト用: エラー状態を取得
   */
  _getErrorState(): Map<string, any> {
    return new Map(this.errorState);
  }

  /**
   * テスト用: エラー状態を設定
   */
  _setErrorState(fileName: string, errorInfo: any): void {
    this.errorState.set(fileName, errorInfo);
  }

  /**
   * リソースをクリーンアップ
   */
  dispose(): void {
    this.clearErrorState();
  }
} 