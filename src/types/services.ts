import * as vscode from 'vscode';
import type { TextUIDSL } from '../renderer/types';
import type { SchemaDefinition, SchemaValidationResult } from './schema';

export interface ISchemaManager {
  initialize(): Promise<void>;
  cleanup(): Promise<void>;
  reinitialize(): Promise<void>;
  debugSchemas(): Promise<void>;
  loadSchema(): Promise<SchemaDefinition>;
  loadTemplateSchema(): Promise<SchemaDefinition>;
  loadThemeSchema(): Promise<SchemaDefinition>;
  validateSchema(data: unknown, schema: SchemaDefinition): SchemaValidationResult;
  registerSchema(filePattern: string, schemaPath: string): Promise<void>;
  unregisterSchema(filePattern: string): Promise<void>;
}

export interface IThemeManager {
  loadTheme(): Promise<void>;
  generateCSSVariables(): string;
  watchThemeFile(callback: (css: string) => void): void;
  getThemePath(): string | undefined;
  setThemePath(themePath: string | undefined): void;
  dispose(): void;
}

export interface IWebViewManager {
  openPreview(): Promise<void>;
  updatePreview(forceUpdate?: boolean): Promise<void>;
  closePreview(): void;
  setLastTuiFile(filePath: string, updatePreview?: boolean): void;
  getLastTuiFile(): string | undefined;
  applyThemeVariables(css: string): void;
  notifyThemeChange(theme: 'light' | 'dark'): void;
  dispose(): void;
  hasPanel(): boolean;
  getPanel(): vscode.WebviewPanel | undefined;
  openDevTools(): void;
}

export interface ExportRequest {
  format: string;
  outputPath?: string;
  fileName?: string;
  themePath?: string;
}

export interface IRegisteredExporter {
  export(dsl: TextUIDSL, options: ExportRequest): Promise<string>;
  getFileExtension(): string;
}

export interface IExportManager {
  registerExporter(format: string, exporter: IRegisteredExporter): void;
  unregisterExporter(format: string): boolean;
  exportFromFile(filePath: string, options: ExportRequest): Promise<string>;
  getSupportedFormats(): string[];
  getFileExtension(format: string): string;
  clearCache(): void;
  clearFormatCache(format: string): void;
  dispose(): void;
}

export interface IExportService {
  executeExport(lastTuiFile?: string): Promise<void>;
}

export interface ITemplateService {
  createTemplate(): Promise<void>;
  insertTemplate(): Promise<void>;
}

export interface ISettingsService {
  openSettings(): Promise<void>;
  resetSettings(): Promise<void>;
  showSettings(): Promise<void>;
  showAutoPreviewSetting(): Promise<void>;
  startWatching(callback: () => void): vscode.Disposable;
  hasConfigurationChanged(event: vscode.ConfigurationChangeEvent): boolean;
}

export interface IDiagnosticManager {
  validateAndReportDiagnostics(document: vscode.TextDocument): Promise<void>;
  clearDiagnostics(): void;
  clearDiagnosticsForUri(uri: vscode.Uri): void;
  clearCache(): void;
  dispose(): void;
}

export interface ICompletionProvider {
  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
    context: vscode.CompletionContext
  ): Promise<vscode.CompletionItem[] | vscode.CompletionList<vscode.CompletionItem>>;
}

export interface ICommandManager {
  registerCommands(): void;
  dispose(): void;
}
