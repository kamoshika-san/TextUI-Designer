import type { IExportService } from '../../types';

export async function executeExportCommand(
  exportService: IExportService,
  filePath?: string
): Promise<void> {
  await exportService.executeExport(filePath);
}

