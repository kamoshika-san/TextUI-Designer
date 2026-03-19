import * as vscode from 'vscode';
import type { IWebViewManager } from '../../types';

type LoggerLike = {
  debug: (message: string, ...args: unknown[]) => void;
  error: (message: string, ...args: unknown[]) => void;
};

export async function executeOpenPreviewCommand(
  webViewManager: IWebViewManager,
  logger: LoggerLike
): Promise<void> {
  logger.debug('openPreviewWithCheck が呼び出されました');
  try {
    logger.debug('WebViewManager.openPreview を呼び出します');
    // ユーザーが明示的にコマンドを実行した場合は、Auto Preview設定に関係なくプレビューを開く
    await webViewManager.openPreview();
    logger.debug('WebViewManager.openPreview が完了しました');
  } catch (error) {
    logger.error('プレビュー表示エラー:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`プレビューの表示に失敗しました: ${errorMessage}`);
  }
}

