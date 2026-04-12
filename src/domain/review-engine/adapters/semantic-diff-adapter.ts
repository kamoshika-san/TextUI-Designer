/**
 * SemanticDiff → DiffIR 変換アダプター（T-RE0-003）
 *
 * 既存の SemanticDiff / SemanticDiffCompareResult を DiffIR に変換する。
 * 既存コードへの変更は一切行わず、アダプターで吸収する。
 */

import type { SemanticDiff } from '../../../types/semantic-diff';
import type { DiffIR, Change } from '../diff-ir';

/**
 * SemanticDiff を DiffIR に変換する。
 * changeId は "change-{index}" 形式で自動採番する。
 */
export function semanticDiffToDiffIR(diff: SemanticDiff): DiffIR {
  const changes: Change[] = diff.changes.map((semanticChange, index) => {
    const changeId = `change-${index}`;

    // props / event / layout / style / condition / binding 系は before/after を持つ
    let before: unknown;
    let after: unknown;
    if (
      semanticChange.type === 'UpdateProps' ||
      semanticChange.type === 'UpdateLayout' ||
      semanticChange.type === 'UpdateStyle' ||
      semanticChange.type === 'UpdateCondition' ||
      semanticChange.type === 'UpdateEvent' ||
      semanticChange.type === 'UpdateBinding'
    ) {
      before = (semanticChange as { before: unknown }).before;
      after = (semanticChange as { after: unknown }).after;
    }

    return {
      changeId,
      type: semanticChange.type,
      before,
      after,
      semanticChange,
      metadata: {}
    };
  });

  return {
    kind: 'diff-ir/v1',
    summary: diff.summary,
    changes
  };
}
