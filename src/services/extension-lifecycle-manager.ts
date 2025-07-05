import * as vscode from 'vscode';
import { ServiceInitializer } from './service-initializer';
import { EventManager } from './event-manager';
import { FileWatcher } from './file-watcher';
import { MemoryMonitor } from './memory-monitor';
import { PerformanceTracker } from './performance-tracker';
import { ErrorHandler } from '../utils/error-handler';
import { logger } from '../utils/logger';

/**
 * 拡張機能のライフサイクル管理
 * activate/deactivateの統合管理を担当
 */
export class ExtensionLifecycleManager {
  private context: vscode.ExtensionContext;
  private serviceInitializer: ServiceInitializer;
  private eventManager: EventManager;
  private fileWatcher: FileWatcher;
  private memoryMonitor: MemoryMonitor;
  private performanceTracker: PerformanceTracker;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.serviceInitializer = new ServiceInitializer(context);
    this.eventManager = new EventManager(context);
    this.fileWatcher = new FileWatcher(context);
    this.memoryMonitor = new MemoryMonitor();
    this.performanceTracker = new PerformanceTracker();
  }

  /**
   * 拡張機能をアクティベート
   */
  async activate(): Promise<void> {
    logger.info('アクティベーション開始');
    
    try {
      // パフォーマンス追跡開始
      this.performanceTracker.startActivation();

      // サービスの初期化
      const services = await this.serviceInitializer.initialize();

      // イベントマネージャーの初期化
      this.eventManager.initialize(services);

      // ファイル監視の開始
      this.fileWatcher.startWatching(services);

      // メモリ監視の開始
      this.memoryMonitor.startMonitoring();

      // パフォーマンス追跡完了
      this.performanceTracker.completeActivation();

      logger.info('アクティベーション完了');

    } catch (error) {
      logger.error('アクティベーション中にエラーが発生しました:', error);
      ErrorHandler.showError('TextUI Designer拡張の初期化に失敗しました', error);
      throw error;
    }
  }

  /**
   * 拡張機能を非アクティベート
   */
  async deactivate(): Promise<void> {
    logger.info('非アクティベーション開始');

    try {
      // パフォーマンス追跡のクリーンアップ
      this.performanceTracker.dispose();

      // メモリ監視の停止
      this.memoryMonitor.stopMonitoring();

      // ファイル監視の停止
      this.fileWatcher.stopWatching();

      // イベントマネージャーのクリーンアップ
      this.eventManager.dispose();

      // サービスのクリーンアップ
      await this.serviceInitializer.cleanup();

      logger.info('非アクティベーション完了');

    } catch (error) {
      logger.error('非アクティベーション中にエラーが発生しました:', error);
    }
  }

  /**
   * コンテキストを取得
   */
  getContext(): vscode.ExtensionContext {
    return this.context;
  }

  /**
   * サービスを取得
   */
  getServices() {
    return this.serviceInitializer.getServices();
  }
} 