/**
 * SemanticDiffCompareResult -> DiffResultExternal adapter.
 */

import type { SemanticDiffCompareResult } from './git-semantic-diff';
import type { DiffResultExternal, ExternalChange } from '../../types/diff-result-external';

function toExternalConfidence(band: string): 'high' | 'medium' | 'low' {
  if (band === 'high' || band === 'medium' || band === 'low') {
    return band;
  }
  return 'low';
}

export function toExternalDiffResult(result: SemanticDiffCompareResult): DiffResultExternal {
  const changes: ExternalChange[] = result.diff.changes.map((change, index) => ({
    changeId: `change-${index}`,
    type: change.type,
    componentId: change.componentId,
    layer: change.layer,
    impact: change.humanReadable?.impact ?? 'low',
    humanReadable: {
      title: change.humanReadable?.title ?? `${change.type} ${change.componentId}`,
      description: change.humanReadable?.description ?? '',
    },
  }));

  return {
    schemaVersion: 'diff-result-external/v1',
    metadata: {
      baseRef: result.metadata.baseRef,
      headRef: result.metadata.headRef,
      filePath: result.metadata.relativeFilePath,
      comparedAt: result.metadata.comparedAt,
    },
    summary: {
      added: result.diff.summary.added,
      removed: result.diff.summary.removed,
      modified: result.diff.summary.modified,
      moved: result.diff.summary.moved,
      confidence: toExternalConfidence(result.diff.confidence.band),
    },
    changes,
  };
}
