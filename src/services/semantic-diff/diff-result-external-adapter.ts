/**
 * SemanticDiffCompareResult → DiffResultExternal 変換アダプター
 *
 * 内部の SemanticDiff 型を外部公開スキーマ（DiffResultExternal）に変換する。
 * 内部実装の詳細（confidence score 等）は外部スキーマに漏らさない。
 */

import type { SemanticDiffCompareResult } from './git-semantic-diff';
import type { DiffResultExternal, ExternalChange, ExternalDecision } from '../../types/diff-result-external';
import type { Decision } from '../../domain/review-engine/decision';

/**
 * confidence band を外部スキーマの confidence に変換する。
 */
function toExternalConfidence(band: string): 'high' | 'medium' | 'low' {
  if (band === 'high' || band === 'medium' || band === 'low') { return band; }
  return 'low';
}

/**
 * SemanticDiffCompareResult を DiffResultExternal に変換する。
 *
 * @param result    SemanticDiff 比較結果
 * @param decisions Decision 一覧（`--include-decisions` 指定時のみ渡す）
 */
export function toExternalDiffResult(
  result: SemanticDiffCompareResult,
  decisions?: Decision[]
): DiffResultExternal {
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

  const externalDecisions: ExternalDecision[] | undefined = decisions?.map(d => ({
    changeId: d.changeId,
    decision: d.decision,
    rationale: d.rationale,
    author: d.author,
    timestamp: d.timestamp,
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
      added:      result.diff.summary.added,
      removed:    result.diff.summary.removed,
      modified:   result.diff.summary.modified,
      moved:      result.diff.summary.moved,
      confidence: toExternalConfidence(result.diff.confidence.band),
    },
    changes,
    ...(externalDecisions !== undefined ? { decisions: externalDecisions } : {}),
  };
}
