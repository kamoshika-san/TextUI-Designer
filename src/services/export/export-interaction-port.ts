/**
 * エクスポート時の VS Code UI（QuickPick / 保存ダイアログ / 通知）を差し替え可能にするポート。
 * アプリケーション層はこのインターフェースのみに依存し、実装が vscode かどうかを知らない。
 */
export interface ExportInteractionPort {
  pickExportFormat(sortedFormats: string[], defaultFormat: string): Promise<string | undefined>;
  pickOutputFilePath(format: string, filterExtension: string): Promise<string | undefined>;
  notifyExportSuccess(message: string): void;
  previewCode(code: string, format: string): Promise<void>;
}
