/**
 * `command-catalog.ts` とドメイン別コマンド断片の共有型（循環参照回避用）。
 */

export type CommandHandler = (...args: unknown[]) => void | Promise<void>;

export type MenuLocation = 'editor/title';

export interface CommandMenuEntry {
  location: MenuLocation;
  when?: string;
  group?: string;
}

export interface CommandCatalogDependencies {
  openPreviewWithCheck: () => Promise<void>;
  capturePreviewImage: () => Promise<void>;
  openDevTools: () => void;
  executeExport: (filePath?: string) => Promise<void>;
  createTemplate: () => Promise<void>;
  insertTemplate: () => Promise<void>;
  openSettings: () => Promise<void>;
  showJumpToDslHelp: () => Promise<void>;
  resetSettings: () => Promise<void>;
  showAutoPreviewSetting: () => Promise<void>;
  checkAutoPreviewSetting: () => Promise<void>;
  reinitializeSchemas: () => Promise<void>;
  debugSchemas: () => Promise<void>;
  showPerformanceReport: () => Promise<void>;
  clearPerformanceMetrics: () => Promise<void>;
  togglePerformanceMonitoring: () => Promise<void>;
  enablePerformanceMonitoring: () => Promise<void>;
  generateSampleEvents: () => Promise<void>;
  showMemoryReport: () => Promise<void>;
  toggleMemoryTracking: () => Promise<void>;
  enableMemoryTracking: () => Promise<void>;
  openOverlayDiff: () => Promise<void>;
}

export interface CommandCatalogEntry {
  command: string;
  title: string;
  menus?: readonly CommandMenuEntry[];
  callback: (deps: CommandCatalogDependencies) => CommandHandler;
}
