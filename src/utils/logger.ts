import * as vscode from 'vscode';

/**
 * ログレベル定義
 */
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  TRACE = 4
}

/**
 * ログ管理システム
 * 開発環境と本番環境で適切にログレベルを制御
 */
export class Logger {
  private static instance: Logger;
  private logLevel: LogLevel;
  private isDevelopment: boolean;

  private constructor() {
    this.isDevelopment = this.detectDevelopmentMode();
    this.logLevel = this.determineLogLevel();
  }

  /**
   * シングルトンインスタンスを取得
   */
  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * 開発モードを検出
   */
  private detectDevelopmentMode(): boolean {
    return (
      process.env.NODE_ENV === 'development' ||
      process.env.VSCODE_DEBUG_MODE === 'true' ||
      process.env.TEXTUI_DEBUG === 'true' ||
      process.env.VSCODE_EXTENSION_DEVELOPMENT_PATH !== undefined
    );
  }

  /**
   * ログレベルを決定
   */
  private determineLogLevel(): LogLevel {
    try {
      // VS Codeの設定からログレベルを取得
      const config = vscode.workspace.getConfiguration('textui-designer.logging');
      const configLevel = config.get<string>('level', 'warn');
      
      // 環境変数からログレベルを取得
      const envLevel = process.env.TEXTUI_LOG_LEVEL;
      
      // 設定の優先順位: 環境変数 > VS Code設定 > デフォルト
      const levelString = envLevel || configLevel;
      
      switch (levelString.toLowerCase()) {
        case 'error': return LogLevel.ERROR;
        case 'warn': return LogLevel.WARN;
        case 'info': return LogLevel.INFO;
        case 'debug': return LogLevel.DEBUG;
        case 'trace': return LogLevel.TRACE;
        default: break;
      }
    } catch (error) {
      // 設定取得に失敗した場合はデフォルト値を使用
    }

    // 開発環境ではDEBUG、本番環境ではWARN
    return this.isDevelopment ? LogLevel.DEBUG : LogLevel.WARN;
  }

  /**
   * ログレベルを設定
   */
  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  /**
   * ログレベルを取得
   */
  getLogLevel(): LogLevel {
    return this.logLevel;
  }

  /**
   * 開発モードかどうかを取得
   */
  isDevMode(): boolean {
    return this.isDevelopment;
  }

  /**
   * デバッグコマンドが有効かどうかを確認
   */
  isDebugCommandsEnabled(): boolean {
    try {
      const config = vscode.workspace.getConfiguration('textui-designer.logging');
      return config.get<boolean>('enableDebugCommands', false) || this.isDevelopment;
    } catch (error) {
      return this.isDevelopment;
    }
  }

  /**
   * エラーログ
   */
  error(message: string, ...args: any[]): void {
    if (this.logLevel >= LogLevel.ERROR) {
      console.error(`[TextUI] ${message}`, ...args);
    }
  }

  /**
   * 警告ログ
   */
  warn(message: string, ...args: any[]): void {
    if (this.logLevel >= LogLevel.WARN) {
      console.warn(`[TextUI] ${message}`, ...args);
    }
  }

  /**
   * 情報ログ
   */
  info(message: string, ...args: any[]): void {
    if (this.logLevel >= LogLevel.INFO) {
      console.log(`[TextUI] ${message}`, ...args);
    }
  }

  /**
   * デバッグログ
   */
  debug(message: string, ...args: any[]): void {
    if (this.logLevel >= LogLevel.DEBUG) {
      console.log(`[TextUI-DEBUG] ${message}`, ...args);
    }
  }

  /**
   * トレースログ
   */
  trace(message: string, ...args: any[]): void {
    if (this.logLevel >= LogLevel.TRACE) {
      console.log(`[TextUI-TRACE] ${message}`, ...args);
    }
  }

  /**
   * パフォーマンスログ（開発環境のみ）
   */
  performance(message: string, ...args: any[]): void {
    if (this.isDevelopment && this.logLevel >= LogLevel.DEBUG) {
      console.log(`[TextUI-PERF] ${message}`, ...args);
    }
  }

  /**
   * メモリログ（開発環境のみ）
   */
  memory(message: string, ...args: any[]): void {
    if (this.isDevelopment && this.logLevel >= LogLevel.DEBUG) {
      console.log(`[TextUI-MEM] ${message}`, ...args);
    }
  }

  /**
   * スキーマログ（開発環境のみ）
   */
  schema(message: string, ...args: any[]): void {
    if (this.isDevelopment && this.logLevel >= LogLevel.DEBUG) {
      console.log(`[TextUI-SCHEMA] ${message}`, ...args);
    }
  }

  /**
   * WebViewログ（開発環境のみ）
   */
  webview(message: string, ...args: any[]): void {
    if (this.isDevelopment && this.logLevel >= LogLevel.DEBUG) {
      console.log(`[TextUI-WEBVIEW] ${message}`, ...args);
    }
  }

  /**
   * テンプレートログ（開発環境のみ）
   */
  template(message: string, ...args: any[]): void {
    if (this.isDevelopment && this.logLevel >= LogLevel.DEBUG) {
      console.log(`[TextUI-TEMPLATE] ${message}`, ...args);
    }
  }
}

/**
 * ロガーのショートカット関数
 */
export const logger = Logger.getInstance(); 