import * as vscode from 'vscode';
import { Logger } from '../utils/logger';

/**
 * メモリ監視
 * メモリ使用量の監視と警告を担当
 */
export class MemoryMonitor {
  private monitoringInterval: NodeJS.Timeout | undefined;
  private isMonitoring = false;
  private readonly logger = new Logger('MemoryMonitor');

  constructor() {
    // コンストラクタでは何もしない
  }

  /**
   * メモリ監視の開始
   */
  startMonitoring(): void {
    if (this.isMonitoring) {
      this.logger.info('メモリ監視は既に開始されています');
      return;
    }

    this.logger.info('メモリ監視を開始します');
    this.isMonitoring = true;

    // メモリ使用量の定期監視
    this.monitoringInterval = setInterval(() => {
      this.checkMemoryUsage();
    }, 60000); // 60秒ごと
  }

  /**
   * メモリ使用量のチェック
   */
  private checkMemoryUsage(): void {
    const memUsage = process.memoryUsage();
    const memUsageMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    
    // 段階的監視（定期監視は警告レベルのみ）
    if (memUsage.heapUsed > 700 * 1024 * 1024) { // 700MB以上 - 定期監視での警告
      this.logger.warn(`定期監視: メモリ使用量が多めです: ${memUsageMB}MB（Extension Host全体）`);
      vscode.window.showWarningMessage(
        `定期監視: メモリ使用量が多めです（${memUsageMB}MB）。VS Codeの再起動を検討してください。`,
        '再起動', '無視'
      ).then(selection => {
        if (selection === '再起動') {
          vscode.commands.executeCommand('workbench.action.reloadWindow');
        }
      });
    } else if (memUsage.heapUsed > 500 * 1024 * 1024) { // 500MB以上 - 情報ログ
      this.logger.info(`定期監視: メモリ使用量 ${memUsageMB}MB（Extension Host全体）`);
    }
  }

  /**
   * リアルタイムメモリチェック（ファイル変更時など）
   */
  checkMemoryUsageRealTime(): void {
    const memUsage = process.memoryUsage();
    const memUsageMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    
    // 段階的警告システム
    if (memUsage.heapUsed > 800 * 1024 * 1024) { // 800MB以上 - CRITICAL
      this.logger.error(`メモリ使用量が危険レベルです: ${memUsageMB}MB`);
      vscode.window.showErrorMessage(
        `メモリ使用量が危険レベルです（${memUsageMB}MB）。すぐにVS Codeを再起動してください。`,
        '今すぐ再起動', 'しばらく様子を見る'
      ).then(selection => {
        if (selection === '今すぐ再起動') {
          vscode.commands.executeCommand('workbench.action.reloadWindow');
        }
      });
    } else if (memUsage.heapUsed > 600 * 1024 * 1024) { // 600MB以上 - WARN
      this.logger.warn(`メモリ使用量が多めです: ${memUsageMB}MB（Extension Host全体、他拡張含む）`);
      vscode.window.showWarningMessage(
        `メモリ使用量が多めです（${memUsageMB}MB）。他の拡張機能も含めた使用量です。`,
        'VS Code再起動', '無視'
      ).then(selection => {
        if (selection === 'VS Code再起動') {
          vscode.commands.executeCommand('workbench.action.reloadWindow');
        }
      });
    } else if (memUsage.heapUsed > 400 * 1024 * 1024) { // 400MB以上 - INFO
      this.logger.info(`メモリ使用量: ${memUsageMB}MB（Extension Host全体）`);
    }
  }

  /**
   * メモリ監視の停止
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      this.logger.info('メモリ監視は既に停止されています');
      return;
    }

    this.logger.info('メモリ監視を停止します');
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    
    this.isMonitoring = false;
  }

  /**
   * 現在のメモリ使用量を取得
   */
  getCurrentMemoryUsage(): { heapUsed: number; heapTotal: number; external: number; rss: number } {
    return process.memoryUsage();
  }

  /**
   * メモリ使用量をMB単位で取得
   */
  getMemoryUsageMB(): { heapUsed: number; heapTotal: number; external: number; rss: number } {
    const memUsage = process.memoryUsage();
    return {
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024),
      rss: Math.round(memUsage.rss / 1024 / 1024)
    };
  }
} 