/**
 * テンプレート作成／設定／スキーマ再初期化・デバッグコマンド（1 ドメイン）。
 * `CommandManager` は `command-catalog` 経由の登録のみ行う。
 */
import type { CommandCatalogEntry } from './command-catalog-deps';

export const TEMPLATE_SETTINGS_COMMAND_ENTRIES: readonly CommandCatalogEntry[] = [
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
  }
];
