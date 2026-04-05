/**
 * VS Code `contributes.commands` および同期対象の `contributes.menus` の単一ソース。
 * `getPackageCommandContributions` / `getPackageMenuContributions` が `sync:commands` で `package.json` に反映される。
 */
import type { CommandCatalogDependencies, CommandCatalogEntry, CommandHandler } from './command-catalog-deps';
import { RUNTIME_INSPECTION_COMMAND_ENTRIES } from './runtime-inspection-command-entries';
import { TEMPLATE_SETTINGS_COMMAND_ENTRIES } from './template-settings-command-entries';

export type { CommandHandler, CommandCatalogDependencies };

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

const CORE_COMMAND_CATALOG: readonly CommandCatalogEntry[] = [
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
    command: 'textui-designer.capturePreviewImage',
    title: 'TextUI: Capture Preview Image',
    callback: deps => () => deps.capturePreviewImage()
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
        when: 'resourceLangId == yaml',
        group: 'navigation'
      }
    ],
    callback: deps => (filePath?: unknown) =>
      deps.executeExport(typeof filePath === 'string' ? filePath : undefined)
  },
  {
    command: 'textui-designer.showJumpToDslHelp',
    title: 'TextUI: Preview to DSL Jump (How to Use)',
    callback: deps => () => deps.showJumpToDslHelp()
  },
  {
    command: 'textui-designer.openOverlayDiff',
    title: 'TextUI: Overlay Diff (透かし比較)',
    menus: [
      {
        location: 'editor/title',
        when: 'resourceLangId == yaml',
        group: 'navigation'
      }
    ],
    callback: deps => () => deps.openOverlayDiff()
  }
];

const COMMAND_CATALOG: readonly CommandCatalogEntry[] = [
  ...CORE_COMMAND_CATALOG,
  ...TEMPLATE_SETTINGS_COMMAND_ENTRIES,
  ...RUNTIME_INSPECTION_COMMAND_ENTRIES
];

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
