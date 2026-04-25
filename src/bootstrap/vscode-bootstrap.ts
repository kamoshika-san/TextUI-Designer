import * as vscode from 'vscode';
import { ExtensionLifecycleManager } from '../services/extension-lifecycle-manager';
import { Logger } from '../utils/logger';
import { installUnhandledRejectionLogger } from '../utils/runtime-error-observability';

let lifecycleManager: ExtensionLifecycleManager | undefined;
const logger = new Logger('VscodeBootstrap');
installUnhandledRejectionLogger('VscodeBootstrap');

export async function bootstrapVscode(context: vscode.ExtensionContext): Promise<void> {
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

export function teardownVscode(): void {
  logger.info('非アクティブ化中');

  if (lifecycleManager) {
    lifecycleManager.deactivate().catch(error => {
      logger.error('ライフサイクルマネージャーのクリーンアップに失敗しました:', error);
    });
    lifecycleManager = undefined;
  }

  logger.info('非アクティブ化完了');
}
