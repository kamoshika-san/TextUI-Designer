import type { TextUIDSL } from '../domain/dsl-types';
import type { DiffRenderTarget } from '../core/textui-core-diff';
import {
  buildRenderTargetsFromDiffResult,
  createDiffResultSkeleton,
  createNormalizedDiffDocument
} from '../core/textui-core-diff';
import type { ExportOptions } from './export-types';
import type { ExportSnapshotState } from './export-snapshot-state';

export interface IncrementalRouteDecision {
  shouldAttempt: boolean;
  renderTargets?: DiffRenderTarget[];
  downgradeReason?: string;
}

/**
 * 増分ルート判定と render target 生成を担当する policy。
 */
export class ExportRoutePolicy {
  constructor(private readonly snapshotState: ExportSnapshotState) {}

  decideIncrementalRoute(dsl: TextUIDSL, options: ExportOptions): IncrementalRouteDecision {
    const sourcePath = options.sourcePath;
    if (options.enableIncrementalDiffRoute !== true || !sourcePath) {
      return { shouldAttempt: false };
    }

    if (!this.snapshotState.hasSnapshot(sourcePath)) {
      return { shouldAttempt: false };
    }

    const previousDsl = this.snapshotState.getSnapshot(sourcePath);
    if (!previousDsl) {
      return { shouldAttempt: false };
    }

    let renderTargets: DiffRenderTarget[];
    try {
      const previous = createNormalizedDiffDocument(previousDsl, { side: 'previous', sourcePath });
      const next = createNormalizedDiffDocument(dsl, { side: 'next', sourcePath });
      renderTargets = buildRenderTargetsFromDiffResult(createDiffResultSkeleton(previous, next));
    } catch (error) {
      return {
        shouldAttempt: false,
        downgradeReason: `diff-computation-error: ${error instanceof Error ? error.message : String(error)}`
      };
    }

    if (renderTargets.length === 0) {
      return {
        shouldAttempt: false,
        downgradeReason: 'empty-render-targets'
      };
    }

    const unresolved = renderTargets.filter(target => target.resolution !== 'resolved');
    if (unresolved.length > 0) {
      return {
        shouldAttempt: false,
        downgradeReason: `unresolved-targets: ${unresolved.length}/${renderTargets.length}`
      };
    }

    return {
      shouldAttempt: true,
      renderTargets
    };
  }
}
