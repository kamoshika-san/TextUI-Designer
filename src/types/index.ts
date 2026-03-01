// 共通型定義ファイル
// サービス間で使用される共通インターフェースとユーティリティ型

import * as vscode from 'vscode';
import { TextUIDSL } from '../renderer/types';

// ============================================================================
// スキーマ関連の型定義
// ============================================================================

export interface SchemaDefinition {
  $schema?: string;
  type: string;
  properties?: Record<string, unknown>;
  required?: string[];
  definitions?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface SchemaValidationResult {
  valid: boolean;
  errors?: SchemaValidationError[];
}

export interface SchemaValidationError {
  keyword: string;
  dataPath: string;
  schemaPath: string;
  params: Record<string, unknown>;
  message: string;
  data?: unknown;
}

// ============================================================================
// サービスインターフェース
// ============================================================================

export interface ISchemaManager {
  initialize(): Promise<void>;
  cleanup(): Promise<void>;
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

// ============================================================================
// テーマ関連の型定義
// ============================================================================

export interface ThemeTokenValue {
  value: string;
  description?: string;
}

export type ThemeTokenEntry =
  | string
  | ThemeTokenValue
  | { [key: string]: ThemeTokenEntry };

export interface ThemeTokens {
  colors?: Record<string, ThemeTokenEntry>;
  spacing?: Record<string, ThemeTokenEntry>;
  typography?: Record<string, ThemeTokenEntry>;
  borderRadius?: Record<string, ThemeTokenEntry>;
  shadows?: Record<string, ThemeTokenEntry>;
  transition?: Record<string, ThemeTokenEntry>;
  [key: string]: unknown;
}

export interface ThemeComponents {
  button?: Record<string, Record<string, string>>;
  input?: Record<string, Record<string, string>>;
  select?: Record<string, Record<string, string>>;
  checkbox?: Record<string, Record<string, string>>;
  radio?: Record<string, Record<string, string>>;
  divider?: Record<string, Record<string, string>>;
  alert?: Record<string, Record<string, string>>;
  text?: Record<string, Record<string, string>>;
  container?: Record<string, Record<string, string>>;
  form?: Record<string, Record<string, string>>;
  [key: string]: unknown;
}

export interface ThemeDefinition {
  theme: {
    name: string;
    description?: string;
    tokens: ThemeTokens;
    components: ThemeComponents;
  };
}

// ============================================================================
// キャッシュ関連の型定義
// ============================================================================

export interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  size: number;
  fileName: string;
}

export interface CacheOptions {
  ttl?: number;
  maxSize?: number;
  maxEntries?: number;
}

// ============================================================================
// パフォーマンス関連の型定義
// ============================================================================

export interface PerformanceMetrics {
  totalEvents: number;
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
  eventsByType: Record<string, number>;
}

export interface PerformanceEvent {
  type: 'render' | 'cache' | 'diff' | 'export' | 'parse' | 'validate';
  duration: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// メモリ関連の型定義
// ============================================================================

export interface MemoryMetrics {
  totalMemory: number;
  webviewMemory: number;
  yamlCacheMemory: number;
  diagnosticsMemory: number;
  renderCacheMemory: number;
  lastMeasurement: number;
}

export interface MemoryTrackedObject {
  id: string;
  size: number;
  category: 'webview' | 'yaml-cache' | 'diagnostics' | 'render-cache';
  metadata?: Record<string, unknown>;
  timestamp: number;
}

// ============================================================================
// エクスポート関連の型定義
// ============================================================================

export type BuiltInExportFormat = 'html' | 'react' | 'pug';
export type ExportFormat = BuiltInExportFormat | (string & {});

export interface ExportOptions {
  includeComments?: boolean;
  minify?: boolean;
  theme?: string;
  [key: string]: unknown;
}

// ============================================================================
// テンプレート関連の型定義
// ============================================================================

export interface TemplateInfo {
  name: string;
  path: string;
  description?: string;
  type: 'component' | 'page' | 'form';
}

// ============================================================================
// WebView関連の型定義
// ============================================================================

export interface WebViewMessage {
  type: string;
  data?: unknown;
  [key: string]: unknown;
}

export interface ParsedYamlResult {
  data: TextUIDSL;
  errors: YamlErrorInfo[];
}

export interface YamlErrorInfo {
  message: string;
  line?: number;
  column?: number;
  details?: Record<string, unknown>;
}

export interface SchemaErrorInfo {
  message: string;
  path: string;
  details?: Record<string, unknown>;
}

// ============================================================================
// ユーティリティ型
// ============================================================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// ============================================================================
// 型ガード関数
// ============================================================================

export function isSchemaDefinition(obj: unknown): obj is SchemaDefinition {
  return typeof obj === 'object' && obj !== null && 'type' in obj;
}

export function isThemeDefinition(obj: unknown): obj is ThemeDefinition {
  return typeof obj === 'object' && obj !== null && 'theme' in obj;
}

export function isWebViewMessage(obj: unknown): obj is WebViewMessage {
  return typeof obj === 'object' && obj !== null && 'type' in obj;
}

export function isCacheEntry<T>(obj: unknown): obj is CacheEntry<T> {
  return typeof obj === 'object' && obj !== null && 'data' in obj && 'timestamp' in obj;
} 