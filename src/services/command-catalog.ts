export type CommandHandler = (...args: unknown[]) => void | Promise<void>;

export interface CommandDefinition {
  command: string;
  callback: CommandHandler;
}

export interface CommandContribution {
  command: string;
  title: string;
}

export interface MenuContribution {
  command: string;
  when?: string;
  group?: string;
}

type MenuLocation = 'editor/title';

interface CommandMenuEntry {
  location: MenuLocation;
  when?: string;
  group?: string;
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
  title: string;
  menus?: readonly CommandMenuEntry[];
  callback: (deps: CommandCatalogDependencies) => CommandHandler;
}

const COMMAND_CATALOG: readonly CommandCatalogEntry[] = [
  {
    command: 'textui-designer.openPreview',
    title: 'TextUI: Open Preview',
    menus: [
      {
        location: 'editor/title',
        when: 'resourceLangId == yaml',
        group: 'navigation'
      }
    ],
    callback: deps => () => deps.openPreviewWithCheck()
  },
  {
    command: 'textui-designer.openDevTools',
    title: 'TextUI: Open Developer Tools',
    callback: deps => () => deps.openDevTools()
  },
  {
    command: 'textui-designer.export',
    title: 'TextUI: Export to Code',
    menus: [
      {
        location: 'editor/title',
        when: 'resourceExtname == .tui.yml',
        group: 'navigation'
      }
    ],
    callback: deps => (filePath?: unknown) =>
      deps.executeExport(typeof filePath === 'string' ? filePath : undefined)
  },
  {
    command: 'textui-designer.createTemplate',
    title: 'TextUI: 新規テンプレート作成',
    callback: deps => () => deps.createTemplate()
  },
  {
    command: 'textui-designer.insertTemplate',
    title: 'TextUI: テンプレート挿入',
    callback: deps => () => deps.insertTemplate()
  },
  {
    command: 'textui-designer.openSettings',
    title: 'TextUI: 設定を開く',
    callback: deps => () => deps.openSettings()
  },
  {
    command: 'textui-designer.resetSettings',
    title: 'TextUI: 設定をリセット',
    callback: deps => () => deps.resetSettings()
  },
  {
    command: 'textui-designer.showSettings',
    title: 'TextUI: 設定を表示',
    callback: deps => () => deps.showAutoPreviewSetting()
  },
  {
    command: 'textui-designer.checkAutoPreviewSetting',
    title: 'TextUI: 自動プレビュー設定を確認',
    callback: deps => () => deps.checkAutoPreviewSetting()
  },
  {
    command: 'textui-designer.reinitializeSchemas',
    title: 'TextUI: スキーマを再初期化',
    callback: deps => () => deps.reinitializeSchemas()
  },
  {
    command: 'textui-designer.debugSchemas',
    title: 'TextUI: スキーマ状態をデバッグ',
    callback: deps => () => deps.debugSchemas()
  },
  {
    command: 'textui-designer.showPerformanceReport',
    title: 'TextUI: パフォーマンスレポートを表示',
    callback: deps => () => deps.showPerformanceReport()
  },
  {
    command: 'textui-designer.clearPerformanceMetrics',
    title: 'TextUI: パフォーマンスメトリクスをクリア',
    callback: deps => () => deps.clearPerformanceMetrics()
  },
  {
    command: 'textui-designer.togglePerformanceMonitoring',
    title: 'TextUI: パフォーマンス監視の切り替え',
    callback: deps => () => deps.togglePerformanceMonitoring()
  },
  {
    command: 'textui-designer.enablePerformanceMonitoring',
    title: 'TextUI: パフォーマンス監視を有効化',
    callback: deps => () => deps.enablePerformanceMonitoring()
  },
  {
    command: 'textui-designer.generateSampleEvents',
    title: 'TextUI: サンプルイベントを生成',
    callback: deps => () => deps.generateSampleEvents()
  },
  {
    command: 'textui-designer.showMemoryReport',
    title: 'TextUI: メモリレポートを表示',
    callback: deps => () => deps.showMemoryReport()
  },
  {
    command: 'textui-designer.toggleMemoryTracking',
    title: 'TextUI: メモリ追跡の切り替え',
    callback: deps => () => deps.toggleMemoryTracking()
  },
  {
    command: 'textui-designer.enableMemoryTracking',
    title: 'TextUI: メモリ追跡を有効化',
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

export function getPackageCommandContributions(): CommandContribution[] {
  return COMMAND_CATALOG.map(entry => ({
    command: entry.command,
    title: entry.title
  }));
}

export function getPackageMenuContributions(): Record<MenuLocation, MenuContribution[]> {
  const menus: Record<MenuLocation, MenuContribution[]> = {
    'editor/title': []
  };

  for (const entry of COMMAND_CATALOG) {
    for (const menu of entry.menus ?? []) {
      const menuContribution: MenuContribution = {
        command: entry.command
      };
      if (menu.when) {
        menuContribution.when = menu.when;
      }
      if (menu.group) {
        menuContribution.group = menu.group;
      }
      menus[menu.location].push(menuContribution);
    }
  }

  return menus;
}
