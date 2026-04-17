/**
 * Runtime inspection / performance / memory diagnostics command entries.
 */
import type { CommandCatalogEntry } from './command-catalog-deps';

export const RUNTIME_INSPECTION_COMMAND_ENTRIES: readonly CommandCatalogEntry[] = [
  {
    command: 'textui-designer.showPerformanceReport',
    title: 'TextUI: Show Performance Report',
    callback: deps => () => deps.showPerformanceReport()
  },
  {
    command: 'textui-designer.clearPerformanceMetrics',
    title: 'TextUI: Clear Performance Metrics',
    callback: deps => () => deps.clearPerformanceMetrics()
  },
  {
    command: 'textui-designer.togglePerformanceMonitoring',
    title: 'TextUI: Toggle Performance Monitoring',
    callback: deps => () => deps.togglePerformanceMonitoring()
  },
  {
    command: 'textui-designer.enablePerformanceMonitoring',
    title: 'TextUI: Enable Performance Monitoring',
    callback: deps => () => deps.enablePerformanceMonitoring()
  },
  {
    command: 'textui-designer.generateSampleEvents',
    title: 'TextUI: Generate Sample Events',
    callback: deps => () => deps.generateSampleEvents()
  },
  {
    command: 'textui-designer.showMemoryReport',
    title: 'TextUI: Show Memory Report',
    callback: deps => () => deps.showMemoryReport()
  },
  {
    command: 'textui-designer.toggleMemoryTracking',
    title: 'TextUI: Toggle Memory Tracking',
    callback: deps => () => deps.toggleMemoryTracking()
  },
  {
    command: 'textui-designer.enableMemoryTracking',
    title: 'TextUI: Enable Memory Tracking',
    callback: deps => () => deps.enableMemoryTracking()
  }
];
