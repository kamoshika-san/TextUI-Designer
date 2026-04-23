import { ConfigManager } from '../utils/config-manager';
import { Logger } from '../utils/logger';
import { PerformanceMonitor } from '../utils/performance-monitor';
import { ExportObservabilityRecorder } from './export-observability-recorder';
import { ExportPipelineWiring } from './export-pipeline-wiring';
import { ExportRoutePolicy } from './export-route-policy';
import { ExportSnapshotState } from './export-snapshot-state';
import { ExporterRegistryCoordinator } from './exporter-registry-coordinator';

export interface ExportManagerComposition {
  registry: ExporterRegistryCoordinator;
  pipelineWiring: ExportPipelineWiring;
  performanceMonitor: PerformanceMonitor;
  maxConcurrentOperations: number;
  snapshotState: ExportSnapshotState;
  routePolicy: ExportRoutePolicy;
  observability: ExportObservabilityRecorder;
}

/**
 * ExportManager の内部 wiring をまとめる composition root。
 */
export class ExportManagerCompositionRoot {
  static compose(): ExportManagerComposition {
    const settings = ConfigManager.getPerformanceSettings();
    const performanceMonitor = PerformanceMonitor.getInstance();
    const snapshotState = new ExportSnapshotState();
    const routePolicy = new ExportRoutePolicy(snapshotState);
    const observability = new ExportObservabilityRecorder(
      performanceMonitor,
      new Logger('ExportManager')
    );
    const registry = new ExporterRegistryCoordinator();
    const pipelineWiring = new ExportPipelineWiring({
      registry,
      performanceMonitor,
      cacheTTL: settings.cacheTTL,
      cacheMaxSize: 100
    });

    return {
      registry,
      pipelineWiring,
      performanceMonitor,
      maxConcurrentOperations: Math.max(1, settings.maxConcurrentOperations || 3),
      snapshotState,
      routePolicy,
      observability
    };
  }
}
