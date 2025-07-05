import * as vscode from 'vscode';
import { ExportManager } from '../exporters';
import { ErrorHandler } from '../utils/error-handler';
import { ConfigManager } from '../utils/config-manager';
import { PerformanceMonitor } from '../utils/performance-monitor';
import path from 'path';

/**
 * エクスポート処理を担当するサービス
 */
export class ExportService {
  private exportManager: ExportManager;
  private performanceMonitor: PerformanceMonitor;

  constructor(exportManager: ExportManager) {
    this.exportManager = exportManager;
    this.performanceMonitor = PerformanceMonitor.getInstance();
  }

  /**
   * エクスポート処理を実行
   */
  async executeExport(lastTuiFile?: string): Promise<void> {
    await ErrorHandler.withErrorHandling(async () => {
      const filePath = await this.getTargetFilePath(lastTuiFile);
      if (!filePath) {return;}

      const format = await this.selectExportFormat();
      if (!format) {return;}

      const outputUri = await this.selectOutputPath(format);
      if (!outputUri) {return;}

      await this.performExport(filePath, format, outputUri);
      
      ErrorHandler.showInfo(`${format.toUpperCase()}ファイルをエクスポートしました: ${outputUri.fsPath}`);
    }, 'エクスポートに失敗しました');
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
   * エクスポート形式を選択
   */
  private async selectExportFormat(): Promise<string | undefined> {
    const settings = ConfigManager.getExportSettings();
    const formats = this.exportManager.getSupportedFormats();
    
    // デフォルト形式が利用可能な場合は最初に表示
    const sortedFormats = formats.sort((a, b) => {
      if (a === settings.defaultFormat) {return -1;}
      if (b === settings.defaultFormat) {return 1;}
      return 0;
    });

    return await vscode.window.showQuickPick(sortedFormats, {
      placeHolder: 'エクスポート形式を選択してください'
    });
  }

  /**
   * 出力先パスを選択
   */
  private async selectOutputPath(format: string): Promise<vscode.Uri | undefined> {
    const extension = this.exportManager.getFileExtension(format);
    return await vscode.window.showSaveDialog({
      filters: {
        [`${format.toUpperCase()} Files`]: [extension]
      }
    });
  }

  /**
   * エクスポートを実行
   */
  private async performExport(
    filePath: string, 
    format: string, 
    outputUri: vscode.Uri
  ): Promise<void> {
    return this.performanceMonitor.measureExportTime(async () => {
      const content = await this.exportManager.exportFromFile(filePath, {
        format: format as 'react' | 'pug' | 'html',
        outputPath: outputUri.fsPath,
        fileName: path.basename(outputUri.fsPath)
      });

      await vscode.workspace.fs.writeFile(outputUri, Buffer.from(content, 'utf-8'));
    });
  }

  /**
   * サポートされているファイルかどうかをチェック
   */
  private isSupportedFile(fileName: string): boolean {
    const supportedExtensions = ConfigManager.getSupportedFileExtensions();
    return supportedExtensions.some(ext => fileName.endsWith(ext));
  }
} 