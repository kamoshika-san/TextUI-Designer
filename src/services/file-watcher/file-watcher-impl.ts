import type * as vscode from 'vscode';
import { ExtensionServices } from '../service-initializer';
import { ConfigManager } from '../../utils/config-manager';
import { MemoryMonitor } from '../memory-monitor';
import { Logger } from '../../utils/logger';
import {
  ActiveEditorSubscription,
  DocumentChangeSubscription,
  DocumentSaveSubscription,
  FileWatcherDeps
} from './file-watcher-subscriptions';
import { FileWatcherSyncState } from './file-watcher-timing';

/**
 * ファイル監視・デバウンス処理
 * ファイル変更、保存、アクティブエディタ変更の監視とデバウンス処理を担当
 */
export class FileWatcher {
  private readonly logger = new Logger('FileWatcher');
  /** 将来の拡張用（現状未使用） */
  private readonly _context: vscode.ExtensionContext;
  private services: ExtensionServices | null = null;
  private disposables: vscode.Disposable[] = [];
  private readonly memoryMonitor: MemoryMonitor;
  private readonly syncState = new FileWatcherSyncState();

  private activeEditorSub?: ActiveEditorSubscription;
  private saveSub?: DocumentSaveSubscription;
  private changeSub?: DocumentChangeSubscription;

  constructor(context: vscode.ExtensionContext) {
    this._context = context;
    this.memoryMonitor = new MemoryMonitor();
  }

  /**
   * ファイル監視の開始
   */
  startWatching(services: ExtensionServices): void {
    this.logger.info('ファイル監視開始');

    this.services = services;

    const deps = this.createDeps();

    this.activeEditorSub = new ActiveEditorSubscription(deps, d => this.disposables.push(d));
    this.saveSub = new DocumentSaveSubscription(deps, d => this.disposables.push(d));
    this.changeSub = new DocumentChangeSubscription(deps, d => this.disposables.push(d));

    this.activeEditorSub.attach();
    this.saveSub.attach();
    this.changeSub.attach();

    this.logger.info('ファイル監視設定完了');
  }

  private createDeps(): FileWatcherDeps {
    return {
      logger: this.logger,
      getServices: () => this.services,
      memoryMonitor: this.memoryMonitor,
      getSyncState: () => this.syncState,
      isSupportedFile: fileName => this.isSupportedFile(fileName)
    };
  }

  /**
   * サポートされているファイルかチェック
   */
  private isSupportedFile(fileName: string): boolean {
    return ConfigManager.isSupportedFile(fileName);
  }

  /**
   * ファイル監視の停止
   */
  stopWatching(): void {
    this.logger.info('ファイル監視停止');

    this.activeEditorSub?.clearTimer();
    this.saveSub?.clearTimer();
    this.changeSub?.clearTimer();
    this.activeEditorSub = undefined;
    this.saveSub = undefined;
    this.changeSub = undefined;

    this.disposables.forEach(disposable => {
      try {
        disposable.dispose();
      } catch (error) {
        this.logger.error('disposable破棄中にエラーが発生しました:', error);
      }
    });

    this.disposables = [];
    this.services = null;
  }
}
