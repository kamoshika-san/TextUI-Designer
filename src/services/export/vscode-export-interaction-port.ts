import * as vscode from 'vscode';
import { ErrorHandler } from '../../utils/error-handler';
import type { ExportInteractionPort } from './export-interaction-port';

/**
 * ExportInteractionPort の VS Code 実装（第1スライス）。
 */
export class VscodeExportInteractionPort implements ExportInteractionPort {
  async pickExportFormat(sortedFormats: string[], _defaultFormat: string): Promise<string | undefined> {
    return vscode.window.showQuickPick(sortedFormats, {
      placeHolder: 'エクスポート形式を選択してください'
    });
  }

  async pickOutputFilePath(format: string, filterExt: string): Promise<string | undefined> {
    const uri = await vscode.window.showSaveDialog({
      filters: {
        [`${format.toUpperCase()} Files`]: [filterExt]
      }
    });
    return uri?.fsPath;
  }

  notifyExportSuccess(message: string): void {
    ErrorHandler.showInfo(message);
  }
}
