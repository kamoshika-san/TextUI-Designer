import { Logger } from '../utils/logger';
import type {
  IncrementalRouteFailureKind,
  IncrementalRouteOutcome,
  IncrementalRouteTrigger,
  PerformanceMonitor
} from '../utils/performance-monitor';

export type IncrementalRouteRecordKind = 'incremental-diff' | 'full-render';

/**
 * incremental route の downgrade reason とメトリクス記録を集約する。
 */
export class ExportObservabilityRecorder {
  private lastIncrementalDowngradeReasonValue: string | null = null;

  constructor(
    private readonly performanceMonitor: PerformanceMonitor,
    private readonly logger: Logger
  ) {}

  get lastIncrementalDowngradeReason(): string | null {
    return this.lastIncrementalDowngradeReasonValue;
  }

  resetIncrementalDowngradeReason(): void {
    this.lastIncrementalDowngradeReasonValue = null;
  }

  setLastIncrementalDowngradeReason(reason: string | null): void {
    this.lastIncrementalDowngradeReasonValue = reason;
  }

  markIncrementalDowngrade(reason: string): void {
    this.lastIncrementalDowngradeReasonValue = reason;
    this.logger.warn(`Incremental route downgraded to full rerender - ${reason}`);
  }

  recordIncrementalRouteSample(
    routeKind: IncrementalRouteRecordKind,
    startedAt: number,
    payload: {
      trigger?: IncrementalRouteTrigger;
      outcome: IncrementalRouteOutcome;
      failureKind?: IncrementalRouteFailureKind;
    }
  ): void {
    this.performanceMonitor.recordIncrementalRouteSample(
      routeKind,
      performance.now() - startedAt,
      {
        ...payload,
        fallbackReason: this.lastIncrementalDowngradeReasonValue
      }
    );
  }
}
