import type { TextUIDSL } from '../../domain/dsl-types';
import type { NavigationFlowDSL } from '../../domain/dsl-types';
import type {
  DiffCompareSide,
  DiffCompareDocument,
  DiffCompareResult,
  FlowDiffCompareDocument,
} from './diff-types';
import type { HeuristicPolicy } from './heuristic-policy';
import type { DiffCompareResultV2Payload } from './diff-v2-types';
import type { SemanticDiffProvider } from './diff-provider';
import {
  createNormalizedDiffDocument,
  createDiffResultSkeleton,
} from './structure-diff';
import { createNormalizedFlowDiffDocument } from './flow-diff';
import { scanEntityDiffs } from './v2-diff-entity-scan';

export class V2SemanticDiffProvider implements SemanticDiffProvider {
  createStructureDiffDocument(
    normalizedDsl: TextUIDSL,
    options: { side: DiffCompareSide; sourcePath?: string }
  ): DiffCompareDocument {
    return createNormalizedDiffDocument(normalizedDsl, options);
  }

  compareStructureDiff(
    previous: DiffCompareDocument,
    next: DiffCompareDocument,
    policy?: HeuristicPolicy
  ): DiffCompareResult {
    const result = createDiffResultSkeleton(previous, next, policy);
    const screens = scanEntityDiffs(previous, next);
    const totalRecords = screens.reduce(
      (sum, s) => sum + ('outOfScope' in s ? 0 : s.diffs.length),
      0
    );
    const v2: DiffCompareResultV2Payload = {
      screens,
      metadata: { schemaVersion: 'v2-compare-logic/v0', totalRecords },
    };
    return { ...result, v2 };
  }

  createFlowDiffDocument(
    normalizedDsl: NavigationFlowDSL,
    options: { side: DiffCompareSide; sourcePath?: string }
  ): FlowDiffCompareDocument {
    return createNormalizedFlowDiffDocument(normalizedDsl, options);
  }
}
