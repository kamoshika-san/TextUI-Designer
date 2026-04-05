/**
 * ConflictResult → ConflictViewResult 変換マッパー — Epic I Slice 3 (T-I04)
 */

import type { ConflictResult } from '../../domain/diff/conflict-detector';
import type { ConflictViewEntry, ConflictViewResult } from '../../domain/diff/conflict-webview-model';
import type { ComponentDef } from '../../domain/dsl-types';

function getLabel(comp: ComponentDef): string {
  return Object.keys(comp)[0] ?? 'unknown';
}

export function toConflictView(result: ConflictResult): ConflictViewResult {
  const entries: ConflictViewEntry[] = result.conflicts.map((entry) => ({
    index: entry.index,
    conflictKind: entry.conflictKind,
    oursLabel: getLabel(entry.ours),
    theirsLabel: getLabel(entry.theirs),
  }));

  return {
    entries,
    hasConflicts: result.hasConflicts,
  };
}
