/**
 * テンプレート作成／設定／スキーマ再初期化・デバッグコマンド（1 ドメイン）。
 * `CommandManager` は `command-catalog` 経由の登録のみ行う。
 */
import type { CommandCatalogEntry } from './command-catalog-deps';

export const TEMPLATE_SETTINGS_COMMAND_ENTRIES: readonly CommandCatalogEntry[] = [
  {
    command: 'textui-designer.createTemplate',
    title: 'TextUI: Create New Template',
    callback: deps => () => deps.createTemplate()
  },
  {
    command: 'textui-designer.insertTemplate',
    title: 'TextUI: Insert Template',
    callback: deps => () => deps.insertTemplate()
  },
  {
    command: 'textui-designer.openSettings',
    title: 'TextUI: Open Settings',
    callback: deps => () => deps.openSettings()
  },
  {
    command: 'textui-designer.resetSettings',
    title: 'TextUI: Reset Settings',
    callback: deps => () => deps.resetSettings()
  },
  {
    command: 'textui-designer.showSettings',
    title: 'TextUI: Show Settings',
    callback: deps => () => deps.showAutoPreviewSetting()
  },
  {
    command: 'textui-designer.checkAutoPreviewSetting',
    title: 'TextUI: Check Auto Preview Setting',
    callback: deps => () => deps.checkAutoPreviewSetting()
  },
  {
    command: 'textui-designer.reinitializeSchemas',
    title: 'TextUI: Reinitialize Schemas',
    callback: deps => () => deps.reinitializeSchemas()
  },
  {
    command: 'textui-designer.debugSchemas',
    title: 'TextUI: Debug Schema State',
    callback: deps => () => deps.debugSchemas()
  }
];
