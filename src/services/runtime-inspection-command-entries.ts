/**
 * ランタイム診断・パフォーマンス／メモリ観測コマンド（1 ドメイン）。
 * `CommandManager` は `command-catalog` 経由の登録のみ行う。
 */
import type { CommandCatalogEntry } from './command-catalog-deps';

export const RUNTIME_INSPECTION_COMMAND_ENTRIES: readonly CommandCatalogEntry[] = [
  {
    command: 'textui-designer.showPerformanceReport',
    title: 'TextUI: パフォーマンスレポートを表示',
    menus: [
      {
        location: 'commandPalette',
        when: 'false'
      }
    ],
    callback: deps => () => deps.showPerformanceReport()
  },
  {
    command: 'textui-designer.clearPerformanceMetrics',
    title: 'TextUI: パフォーマンスメトリクスをクリア',
    menus: [
      {
        location: 'commandPalette',
        when: 'false'
      }
    ],
    callback: deps => () => deps.clearPerformanceMetrics()
  },
  {
    command: 'textui-designer.togglePerformanceMonitoring',
    title: 'TextUI: パフォーマンス監視の切り替え',
    menus: [
      {
        location: 'commandPalette',
        when: 'false'
      }
    ],
    callback: deps => () => deps.togglePerformanceMonitoring()
  },
  {
    command: 'textui-designer.enablePerformanceMonitoring',
    title: 'TextUI: パフォーマンス監視を有効化',
    menus: [
      {
        location: 'commandPalette',
        when: 'false'
      }
    ],
    callback: deps => () => deps.enablePerformanceMonitoring()
  },
  {
    command: 'textui-designer.generateSampleEvents',
    title: 'TextUI: サンプルイベントを生成',
    menus: [
      {
        location: 'commandPalette',
        when: 'false'
      }
    ],
    callback: deps => () => deps.generateSampleEvents()
  },
  {
    command: 'textui-designer.showMemoryReport',
    title: 'TextUI: メモリレポートを表示',
    menus: [
      {
        location: 'commandPalette',
        when: 'false'
      }
    ],
    callback: deps => () => deps.showMemoryReport()
  },
  {
    command: 'textui-designer.toggleMemoryTracking',
    title: 'TextUI: メモリ追跡の切り替え',
    menus: [
      {
        location: 'commandPalette',
        when: 'false'
      }
    ],
    callback: deps => () => deps.toggleMemoryTracking()
  },
  {
    command: 'textui-designer.enableMemoryTracking',
    title: 'TextUI: メモリ追跡を有効化',
    menus: [
      {
        location: 'commandPalette',
        when: 'false'
      }
    ],
    callback: deps => () => deps.enableMemoryTracking()
  }
];
