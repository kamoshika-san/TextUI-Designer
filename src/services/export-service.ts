import * as vscode from 'vscode';
import { ErrorHandler } from '../utils/error-handler';
import { ConfigManager } from '../utils/config-manager';
import type { IExportManager, IExportService, IThemeManager } from '../types';
import type { ExportInteractionPort } from './export/export-interaction-port';
import { VscodeExportInteractionPort } from './export/vscode-export-interaction-port';
import { ExportApplicationService, createVscodeExportPerformWrite } from './export/export-application-service';

/**
 * エクスポート処理を担当するサービス（UI は ExportInteractionPort へ委譲）。
 */
export class ExportService implements IExportService {
  private exportManager: IExportManager;
  private themeManager?: IThemeManager;
  private extensionPath?: string;
  private readonly application: ExportApplicationService;

  constructor(
    exportManager: IExportManager,
    themeManager?: IThemeManager,
    extensionPath?: string,
    interactionPort: ExportInteractionPort = new VscodeExportInteractionPort()
  ) {
    this.exportManager = exportManager;
    this.themeManager = themeManager;
    this.extensionPath = extensionPath;
    this.application = new ExportApplicationService(
      exportManager,
      interactionPort,
      (last) => this.getTargetFilePath(last),
      createVscodeExportPerformWrite(exportManager, themeManager, extensionPath)
    );
  }

  /**
   * エクスポート処理を実行
   */
  async executeExport(lastTuiFile?: string): Promise<void> {
    const result = await ErrorHandler.executeSafely(async () => {
      await this.application.run(lastTuiFile);
    }, 'エクスポートに失敗しました');

    if (!result) {
      // エラーハンドリングは既にErrorHandlerで処理済み
      return;
    }
  }

  /**
   * エクスポート対象ファイルのパスを取得
   */
  private async getTargetFilePath(lastTuiFile?: string): Promise<string | undefined> {
    const activeEditor = vscode.window.activeTextEditor;

    if (activeEditor && this.isSupportedFile(activeEditor.document.fileName)) {
      return activeEditor.document.fileName;
    }

    if (lastTuiFile) {
      return lastTuiFile;
    }

    ErrorHandler.showError('エクスポート対象の.tui.ymlファイルが見つかりません。');
    return undefined;
  }

  /**
   * サポートされているファイルかどうかをチェック
   */
  private isSupportedFile(fileName: string): boolean {
    return ConfigManager.isSupportedFile(fileName);
  }
}
