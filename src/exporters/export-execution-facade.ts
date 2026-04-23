import type { NavigationFlowDSL, TextUIDSL } from '../domain/dsl-types';
import { isNavigationFlowDSL } from '../domain/dsl-types';
import type { ExportOptions } from './export-types';
import type { ExportPipelineDeps, ExportWithDiffUpdateResult } from './export-pipeline';
import { runOptimizedExport } from './export-pipeline';
import type { ExportRoutePolicy } from './export-route-policy';
import type { ExportSnapshotState } from './export-snapshot-state';
import type { ExportObservabilityRecorder } from './export-observability-recorder';

type FullRenderTrigger = 'direct' | 'fallback';

interface ExportExecutionFacadeDeps {
  routePolicy: ExportRoutePolicy;
  snapshotState: ExportSnapshotState;
  observability: ExportObservabilityRecorder;
  pipelineDeps: () => ExportPipelineDeps;
  runNavigationExporter: (dsl: NavigationFlowDSL, options: ExportOptions) => Promise<string>;
  exportWithDiffUpdate: (dsl: TextUIDSL, options: ExportOptions) => Promise<ExportWithDiffUpdateResult>;
}

/**
 * ExportManager から実行オーケストレーションを分離する facade。
 */
export class ExportExecutionFacade {
  constructor(private readonly deps: ExportExecutionFacadeDeps) {}

  async export(
    dsl: TextUIDSL | NavigationFlowDSL,
    options: ExportOptions
  ): Promise<string> {
    this.deps.observability.resetIncrementalDowngradeReason();

    if (isNavigationFlowDSL(dsl)) {
      return this.runMeasuredFullRender(dsl, options, 'direct');
    }

    const decisionStart = performance.now();
    const decision = this.deps.routePolicy.decideIncrementalRoute(dsl, options);

    if (!decision.shouldAttempt) {
      if (decision.downgradeReason) {
        this.deps.observability.markIncrementalDowngrade(decision.downgradeReason);
        this.deps.observability.recordIncrementalRouteSample('incremental-diff', decisionStart, {
          outcome: 'fallback',
          failureKind: 'preflight'
        });
        return this.runMeasuredFullRender(dsl, options, 'fallback');
      }
      return this.runMeasuredFullRender(dsl, options, 'direct');
    }

    const incrementalResult = await this.tryIncrementalExport(
      dsl,
      options,
      decisionStart,
      decision.renderTargets ?? []
    );
    if (incrementalResult !== undefined) {
      return incrementalResult;
    }

    return this.runMeasuredFullRender(dsl, options, 'fallback');
  }

  rememberSnapshotIfPossible(dsl: TextUIDSL | NavigationFlowDSL, sourcePath: string | undefined): void {
    if (isNavigationFlowDSL(dsl) || !sourcePath) {
      return;
    }
    this.deps.snapshotState.rememberSnapshot(sourcePath, dsl);
  }

  private async runMeasuredFullRender(
    dsl: TextUIDSL | NavigationFlowDSL,
    options: ExportOptions,
    trigger: FullRenderTrigger
  ): Promise<string> {
    const startedAt = performance.now();
    const result = isNavigationFlowDSL(dsl)
      ? await this.deps.runNavigationExporter(dsl, options)
      : await runOptimizedExport(dsl, options, this.deps.pipelineDeps());
    this.deps.observability.recordIncrementalRouteSample('full-render', startedAt, {
      trigger,
      outcome: 'success'
    });
    return result;
  }

  private async tryIncrementalExport(
    dsl: TextUIDSL,
    options: ExportOptions,
    startedAt: number,
    renderTargets: ExportOptions['incrementalRenderTargets']
  ): Promise<string | undefined> {
    try {
      const incrementalResult = await this.deps.exportWithDiffUpdate(dsl, {
        ...options,
        incrementalRenderTargets: renderTargets
      });

      if (!this.isValidIncrementalResult(incrementalResult)) {
        this.deps.observability.markIncrementalDowngrade('invalid-incremental-result');
        this.deps.observability.recordIncrementalRouteSample('incremental-diff', startedAt, {
          outcome: 'fallback',
          failureKind: 'invalid-result'
        });
        return undefined;
      }

      this.deps.observability.resetIncrementalDowngradeReason();
      this.deps.observability.recordIncrementalRouteSample('incremental-diff', startedAt, {
        outcome: 'success'
      });
      return incrementalResult.result;
    } catch (error) {
      this.deps.observability.markIncrementalDowngrade(
        `incremental-route-error: ${error instanceof Error ? error.message : String(error)}`
      );
      this.deps.observability.recordIncrementalRouteSample('incremental-diff', startedAt, {
        outcome: 'fallback',
        failureKind: 'execution-error'
      });
      return undefined;
    }
  }

  private isValidIncrementalResult(result: ExportWithDiffUpdateResult): boolean {
    return typeof result.result === 'string'
      && result.result.length > 0
      && Array.isArray(result.changedComponents);
  }
}
