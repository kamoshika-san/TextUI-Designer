import * as vscode from 'vscode';
import { ExtensionLifecycleManager } from './services/extension-lifecycle-manager';
import { Logger } from './utils/logger';

let lifecycleManager: ExtensionLifecycleManager | undefined;
const logger = new Logger('Extension');

export async function activate(context: vscode.ExtensionContext) {
  logger.info('アクティベーション開始');


  try {
    lifecycleManager = new ExtensionLifecycleManager(context);
    await lifecycleManager.activate();
    logger.info('アクティベーション完了');
  } catch (error) {
    logger.error('アクティベーション中にエラーが発生しました:', error);
    if (error instanceof Error && error.stack) {
      logger.error('スタックトレース:', error.stack);
    }
    vscode.window.showErrorMessage(`TextUI Designer拡張の初期化に失敗しました: ${error}`);
    throw error;
  }
}

export function deactivate() {
  logger.info('非アクティブ化中');


  if (lifecycleManager) {
    lifecycleManager.deactivate().catch(error => {
      logger.error('ライフサイクルマネージャーのクリーンアップに失敗しました:', error);
    });
    lifecycleManager = undefined;
  }

  logger.info('非アクティブ化完了');
}
