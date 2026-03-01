export type CommandHandler = (...args: unknown[]) => void | Promise<void>;

export interface CommandDefinition {
  command: string;
  callback: CommandHandler;
}

export interface CommandCatalogDependencies {
  openPreviewWithCheck: () => Promise<void>;
  openDevTools: () => void;
  executeExport: (filePath?: string) => Promise<void>;
  createTemplate: () => Promise<void>;
  insertTemplate: () => Promise<void>;
  openSettings: () => Promise<void>;
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
}

interface CommandCatalogEntry {
  command: string;
  callback: (deps: CommandCatalogDependencies) => CommandHandler;
}

const COMMAND_CATALOG: readonly CommandCatalogEntry[] = [
  {
    command: 'textui-designer.openPreview',
    callback: deps => () => deps.openPreviewWithCheck()
  },
  {
    command: 'textui-designer.openDevTools',
    callback: deps => () => deps.openDevTools()
  },
  {
    command: 'textui-designer.export',
    callback: deps => (filePath?: unknown) =>
      deps.executeExport(typeof filePath === 'string' ? filePath : undefined)
  },
  {
    command: 'textui-designer.createTemplate',
    callback: deps => () => deps.createTemplate()
  },
  {
    command: 'textui-designer.insertTemplate',
    callback: deps => () => deps.insertTemplate()
  },
  {
    command: 'textui-designer.openSettings',
    callback: deps => () => deps.openSettings()
  },
  {
    command: 'textui-designer.resetSettings',
    callback: deps => () => deps.resetSettings()
  },
  {
    command: 'textui-designer.showSettings',
    callback: deps => () => deps.showAutoPreviewSetting()
  },
  {
    command: 'textui-designer.checkAutoPreviewSetting',
    callback: deps => () => deps.checkAutoPreviewSetting()
  },
  {
    command: 'textui-designer.reinitializeSchemas',
    callback: deps => () => deps.reinitializeSchemas()
  },
  {
    command: 'textui-designer.debugSchemas',
    callback: deps => () => deps.debugSchemas()
  },
  {
    command: 'textui-designer.showPerformanceReport',
    callback: deps => () => deps.showPerformanceReport()
  },
  {
    command: 'textui-designer.clearPerformanceMetrics',
    callback: deps => () => deps.clearPerformanceMetrics()
  },
  {
    command: 'textui-designer.togglePerformanceMonitoring',
    callback: deps => () => deps.togglePerformanceMonitoring()
  },
  {
    command: 'textui-designer.enablePerformanceMonitoring',
    callback: deps => () => deps.enablePerformanceMonitoring()
  },
  {
    command: 'textui-designer.generateSampleEvents',
    callback: deps => () => deps.generateSampleEvents()
  },
  {
    command: 'textui-designer.showMemoryReport',
    callback: deps => () => deps.showMemoryReport()
  },
  {
    command: 'textui-designer.toggleMemoryTracking',
    callback: deps => () => deps.toggleMemoryTracking()
  },
  {
    command: 'textui-designer.enableMemoryTracking',
    callback: deps => () => deps.enableMemoryTracking()
  }
] as const;

export const TEXTUI_COMMAND_IDS: readonly string[] = COMMAND_CATALOG.map(entry => entry.command);

export function createCommandDefinitions(deps: CommandCatalogDependencies): CommandDefinition[] {
  return COMMAND_CATALOG.map(entry => ({
    command: entry.command,
    callback: entry.callback(deps)
  }));
}
