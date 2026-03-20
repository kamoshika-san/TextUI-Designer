import * as vscode from 'vscode';
import { ServiceInitializer } from './service-initializer';
import { EventManager } from './event-manager';
import { FileWatcher } from './file-watcher';
import { MemoryMonitor } from './memory-monitor';
import { PerformanceTracker } from './performance-tracker';
import { ACTIVATION_PHASES, DEACTIVATION_PHASES } from './extension-lifecycle-phases';
import { ErrorHandler } from '../utils/error-handler';
import { Logger } from '../utils/logger';

/**
 * 拡張機能のライフサイクル管理
 * activate/deactivateの統合管理を担当
 */
export class ExtensionLifecycleManager {
  private readonly logger = new Logger('ExtensionLifecycleManager');
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
    this.logger.info('アクティベーション開始');

    try {
      const activationCtx = {
        serviceInitializer: this.serviceInitializer,
        eventManager: this.eventManager,
        fileWatcher: this.fileWatcher,
        memoryMonitor: this.memoryMonitor,
        performanceTracker: this.performanceTracker,
        services: null
      };

      for (const phase of ACTIVATION_PHASES) {
        await phase.run(activationCtx);
      }

      this.logger.info('アクティベーション完了');
    } catch (error) {
      this.logger.error('アクティベーション中にエラーが発生しました:', error);
      ErrorHandler.showError('TextUI Designer拡張の初期化に失敗しました', error);
      throw error;
    }
  }

  /**
   * 拡張機能を非アクティベート
   */
  async deactivate(): Promise<void> {
    this.logger.info('非アクティベーション開始');

    try {
      const deactivationCtx = {
        performanceTracker: this.performanceTracker,
        memoryMonitor: this.memoryMonitor,
        fileWatcher: this.fileWatcher,
        eventManager: this.eventManager,
        serviceInitializer: this.serviceInitializer
      };

      for (const phase of DEACTIVATION_PHASES) {
        await phase.run(deactivationCtx);
      }

      this.logger.info('非アクティベーション完了');
    } catch (error) {
      this.logger.error('非アクティベーション中にエラーが発生しました:', error);
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
