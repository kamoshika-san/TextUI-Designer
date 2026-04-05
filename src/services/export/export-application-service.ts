import path from 'path';
import { ConfigManager } from '../../utils/config-manager';
import { PerformanceMonitor } from '../../utils/performance-monitor';
import type { IExportManager, IThemeManager } from '../../types';
import type { ExportInteractionPort } from './export-interaction-port';

export type ExportPerformWrite = (filePath: string, format: string, outputFsPath: string) => Promise<void>;

/**
 * エクスポートのユースケース（UI は ExportInteractionPort 経由のみ）。
 */
export class ExportApplicationService {
  constructor(
    private readonly exportManager: IExportManager,
    private readonly port: ExportInteractionPort,
    private readonly resolveTargetPath: (lastTuiFile?: string) => Promise<string | undefined>,
    private readonly performExportWrite: ExportPerformWrite
  ) {}

  async runPreview(lastTuiFile?: string): Promise<void> {
    const filePath = await this.resolveTargetPath(lastTuiFile);
    if (!filePath) {
      return;
    }

    const settings = ConfigManager.getExportSettings();
    const formats = [...this.exportManager.getSupportedFormats()].sort((a, b) => {
      if (a === settings.defaultFormat) {
        return -1;
      }
      if (b === settings.defaultFormat) {
        return 1;
      }
      return 0;
    });

    const format = await this.port.pickExportFormat(formats, settings.defaultFormat);
    if (!format) {
      return;
    }

    const code = await this.exportManager.exportFromFile(filePath, { format });
    await this.port.previewCode(code, format);
  }

  async run(lastTuiFile?: string): Promise<void> {
    const filePath = await this.resolveTargetPath(lastTuiFile);
    if (!filePath) {
      return;
    }

    const settings = ConfigManager.getExportSettings();
    const formats = [...this.exportManager.getSupportedFormats()].sort((a, b) => {
      if (a === settings.defaultFormat) {
        return -1;
      }
      if (b === settings.defaultFormat) {
        return 1;
      }
      return 0;
    });

    const format = await this.port.pickExportFormat(formats, settings.defaultFormat);
    if (!format) {
      return;
    }

    const extension = this.exportManager.getFileExtension(format);
    const filterExt = extension.startsWith('.') ? extension.slice(1) : extension;
    const outputFsPath = await this.port.pickOutputFilePath(format, filterExt);
    if (!outputFsPath) {
      return;
    }

    await this.performExportWrite(filePath, format, outputFsPath);

    this.port.notifyExportSuccess(`${format.toUpperCase()}ファイルをエクスポートしました: ${outputFsPath}`);
  }
}

/**
 * 既存の measureExport + workspace.fs.writeFile 相当（ExportService から注入）。
 */
export function createVscodeExportPerformWrite(
  exportManager: IExportManager,
  themeManager: IThemeManager | undefined,
  extensionPath: string | undefined
): ExportPerformWrite {
  const performanceMonitor = PerformanceMonitor.getInstance();
  return async (filePath: string, format: string, outputFsPath: string) => {
    await performanceMonitor.measureExportTime(async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- テストの require フックと整合（モジュール先頭の import だと束縛が古くなる場合がある）
      const vscode = require('vscode') as typeof import('vscode');
      const content = await exportManager.exportFromFile(filePath, {
        format,
        outputPath: outputFsPath,
        fileName: path.basename(outputFsPath),
        themePath: themeManager?.getThemePath(),
        sourcePath: filePath,
        extensionPath
      });

      await vscode.workspace.fs.writeFile(vscode.Uri.file(outputFsPath), Buffer.from(content, 'utf-8'));
    });
  };
}
