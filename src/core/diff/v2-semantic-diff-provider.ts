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
import { scanComponentDiffs } from './v2-diff-component-scan';
import type { V2EntityDiff } from './diff-v2-types';

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
    const componentDiffs = scanComponentDiffs(previous, next);

    const populatedScreens = screens.map(s => {
      if ('outOfScope' in s) { return s; }
      if (componentDiffs.length === 0) {
        return s;
      }

      if (s.entities.length > 0) {
        const [firstEntity, ...rest] = s.entities;
        const mergedEntity: V2EntityDiff = {
          ...firstEntity,
          components: componentDiffs,
        };
        return { ...s, entities: [mergedEntity, ...rest] };
      }

      return {
        ...s,
        entities: [{ entity_id: `${s.screen_id}-components`, diffs: [], components: componentDiffs }],
      };
    });

    const totalRecords = populatedScreens.reduce((sum, s) => {
      if ('outOfScope' in s) { return sum; }
      const screenDiffs = s.diffs.length;
      const entityDiffs = s.entities.reduce((es, e) => es + e.diffs.length, 0);
      const compDiffs = s.entities.reduce(
        (es, e) => es + e.components.reduce((cs, c) => cs + c.diffs.length, 0),
        0
      );
      return sum + screenDiffs + entityDiffs + compDiffs;
    }, 0);

    const v2: DiffCompareResultV2Payload = {
      screens: populatedScreens,
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
