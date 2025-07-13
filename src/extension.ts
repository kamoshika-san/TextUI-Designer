import * as vscode from 'vscode';
import { ExtensionLifecycleManager } from './services/extension-lifecycle-manager';
import { TextUIMemoryTracker } from './utils/textui-memory-tracker';
import { logger } from './utils/logger';
import { ErrorHandler } from './utils/error-handler';

// グローバル変数としてライフサイクルマネージャーを保存
let lifecycleManager: ExtensionLifecycleManager | undefined;

/**
 * 拡張機能のアクティベーション
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  logger.info('TextUI Designer拡張をアクティブ化中...');

  // メモリ追跡システムの初期化
  const memoryTracker = TextUIMemoryTracker.getInstance();
  logger.debug('メモリ追跡システムを初期化しました');

  try {
    // ライフサイクルマネージャーの初期化
    lifecycleManager = new ExtensionLifecycleManager(context);
    
    // 拡張機能のアクティベーション
    await lifecycleManager.activate();
    
    logger.info('TextUI Designer拡張のアクティベーション完了');
  }, {
    errorMessage: '拡張機能のアクティベーションに失敗しました',
    errorCode: 'ACTIVATION_FAILED',
    rethrow: true,
    logLevel: 'error',
    showToUser: true
  });
}

/**
 * 拡張機能の非アクティベーション
 */
export function deactivate(): void {
  ErrorHandler.withErrorHandlingSync(() => {
    logger.info('TextUI Designer拡張を非アクティブ化中...');

    // メモリ追跡システムのクリーンアップ
    const memoryTracker = TextUIMemoryTracker.getInstance();
    memoryTracker.dispose();
    logger.debug('メモリ追跡システムをクリーンアップしました');

    // ライフサイクルマネージャーのクリーンアップ
    if (lifecycleManager) {
      lifecycleManager.deactivate().catch(error => {
        logger.error('ライフサイクルマネージャーのクリーンアップに失敗しました:', error);
      });
      lifecycleManager = undefined;
    }

    logger.info('TextUI Designer拡張の非アクティベーション完了');
  }, {
    errorMessage: '拡張機能の非アクティベーションに失敗しました',
    errorCode: 'DEACTIVATION_FAILED',
    rethrow: false, // 非アクティベーションでは例外を再スローしない
    logLevel: 'warn',
    showToUser: false // 非アクティベーションエラーはユーザーに表示しない
  });
} 