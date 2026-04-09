import * as vscode from 'vscode';
import { ConfigManager } from '../../utils/config-manager';
import type { IWebViewManager } from '../../types';

type LoggerLike = {
  debug: (message: string, ...args: unknown[]) => void;
  error: (message: string, ...args: unknown[]) => void;
};

export async function executeOpenPreviewCommand(
  webViewManager: IWebViewManager,
  logger: LoggerLike
): Promise<void> {
  logger.debug('openPreviewWithCheck called');

  try {
    const activeFilePath = vscode.window.activeTextEditor?.document.fileName;
    if (activeFilePath && ConfigManager.isSupportedFile(activeFilePath)) {
      webViewManager.setLastTuiFile(activeFilePath);
      logger.debug(`preview target set from active editor: ${activeFilePath}`);
    }

    logger.debug('Opening preview panel');
    await webViewManager.openPreview();
    logger.debug('Preview panel opened');
  } catch (error) {
    logger.error('Failed to open preview:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`プレビューの表示に失敗しました: ${errorMessage}`);
  }
}
