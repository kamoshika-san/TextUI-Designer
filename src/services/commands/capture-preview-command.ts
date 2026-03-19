import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { ConfigManager } from '../../utils/config-manager';
import { capturePreviewImageFromDslFile } from '../../utils/preview-capture';
import type { IThemeManager, IWebViewManager } from '../../types';

type LoggerLike = {
  info: (message: string, ...args: unknown[]) => void;
};

export type CapturePreviewDependencies = {
  webViewManager: IWebViewManager;
  themeManager?: IThemeManager;
  extensionPath: string;
  logger: LoggerLike;
};

export function resolveCaptureTargetFile(webViewManager: IWebViewManager): string | undefined {
  const activeFile = vscode.window.activeTextEditor?.document.fileName;
  if (activeFile && ConfigManager.isSupportedFile(activeFile)) {
    return activeFile;
  }

  const lastFile = webViewManager.getLastTuiFile();
  if (lastFile && ConfigManager.isSupportedFile(lastFile)) {
    return lastFile;
  }

  return undefined;
}

export async function executeCapturePreviewCommand(
  deps: CapturePreviewDependencies
): Promise<void> {
  const targetFile = resolveCaptureTargetFile(deps.webViewManager);
  if (!targetFile) {
    vscode.window.showWarningMessage('キャプチャ対象の .tui.yml ファイルが見つかりません。');
    return;
  }

  const defaultFileName = `${path.basename(targetFile).replace(/\.tui\.ya?ml$/i, '')}.preview.png`;
  const defaultUri = vscode.Uri.file(path.join(path.dirname(targetFile), defaultFileName));
  const outputUri = await vscode.window.showSaveDialog({
    defaultUri,
    saveLabel: 'プレビュー画像を保存',
    filters: {
      PNG: ['png']
    }
  });

  if (!outputUri) {
    return;
  }

  const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri?.fsPath;
  const cliSpawnPath = (workspaceFolder && fs.existsSync(path.join(workspaceFolder, 'out', 'cli', 'index.js')))
    ? workspaceFolder
    : undefined;

  const webViewThemePath = deps.themeManager?.getThemePath();
  const themePathForCapture = (webViewThemePath && fs.existsSync(webViewThemePath))
    ? webViewThemePath
    : undefined;

  try {
    await capturePreviewImageFromDslFile(targetFile, {
      outputPath: outputUri.fsPath,
      themePath: themePathForCapture,
      useWebViewTheme: true,
      extensionPath: deps.extensionPath,
      cliSpawnPath,
      log: (msg) => deps.logger.info(msg)
    });
    vscode.window.showInformationMessage(`プレビュー画像を出力しました: ${outputUri.fsPath}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`プレビュー画像の出力に失敗しました: ${message}`);
  }
}

