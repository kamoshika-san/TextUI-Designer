import type { RuntimeInspectionService } from './runtime-inspection-service';
import type { CommandCatalogDependencies } from './command-catalog-deps';

/**
 * runtime inspection 系コマンドのコールバック束（CommandManager が CommandCatalog に渡す単位）。
 * `RuntimeInspectionService` から生成するか、テストでスタブを直に渡す。
 */
export type RuntimeInspectionCommandBindings = Pick<
  CommandCatalogDependencies,
  | 'showPerformanceReport'
  | 'clearPerformanceMetrics'
  | 'togglePerformanceMonitoring'
  | 'enablePerformanceMonitoring'
  | 'generateSampleEvents'
  | 'showMemoryReport'
  | 'toggleMemoryTracking'
  | 'enableMemoryTracking'
>;

export function createRuntimeInspectionCommandBindings(
  service: RuntimeInspectionService
): RuntimeInspectionCommandBindings {
  return {
    showPerformanceReport: () => service.showPerformanceReport(),
    clearPerformanceMetrics: () => service.clearPerformanceMetrics(),
    togglePerformanceMonitoring: () => service.togglePerformanceMonitoring(),
    enablePerformanceMonitoring: () => service.enablePerformanceMonitoring(),
    generateSampleEvents: () => service.generateSampleEvents(),
    showMemoryReport: () => service.showMemoryReport(),
    toggleMemoryTracking: () => service.toggleMemoryTracking(),
    enableMemoryTracking: () => service.enableMemoryTracking()
  };
}
