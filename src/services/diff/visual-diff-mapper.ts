/**
 * Visual Diff マッパー
 *
 * DiffResult（src/exporters/metrics/diff-manager.ts）と DSL コンポーネント配列を受け取り、
 * VisualDiffResult（src/domain/diff/visual-diff-model.ts）に変換する。
 *
 * WebView への送信・CSS ハイライトは Slice 2 の責務。
 */

import type { ComponentDef } from '../../domain/dsl-types';
import type { DiffResult } from '../../exporters/metrics/diff-manager';
import type { VisualDiffNode, VisualDiffResult, ChangeType } from '../../domain/diff/visual-diff-model';

/**
 * ComponentDef のタグキー（例: "Button", "Text"）を返す。
 * ComponentDef は `{ Button: ButtonComponent } | { Text: TextComponent } | ...` 形式。
 */
function getKind(comp: ComponentDef): string {
  return Object.keys(comp)[0] ?? 'unknown';
}

/**
 * 内部コンポーネントオブジェクトから代表ラベル文字列を生成する。
 */
function resolveLabel(comp: ComponentDef): string {
  const kind = getKind(comp);
  const inner = (comp as Record<string, unknown>)[kind];
  if (inner !== null && typeof inner === 'object') {
    const props = inner as Record<string, unknown>;
    const candidate = props['label'] ?? props['text'] ?? props['title'] ?? props['name'] ?? props['value'];
    if (typeof candidate === 'string' && candidate.length > 0) {
      return `${kind}: ${candidate}`;
    }
  }
  return kind;
}

function makeNode(comp: ComponentDef, changeType: ChangeType): VisualDiffNode {
  return {
    kind: getKind(comp),
    label: resolveLabel(comp),
    changeType,
    children: [],
  };
}

/**
 * DiffResult と旧／新コンポーネント配列から VisualDiffResult を生成する。
 *
 * @param diffResult   DiffManager.computeDiff() の戻り値
 * @param oldComponents diff 前の DSL components 配列
 * @param newComponents diff 後の DSL components 配列
 */
export function toVisualDiff(
  diffResult: DiffResult,
  oldComponents: ComponentDef[],
  newComponents: ComponentDef[],
): VisualDiffResult {
  const nodes: VisualDiffNode[] = [];

  const addedSet = new Set(diffResult.addedComponents);
  const removedSet = new Set(diffResult.removedComponents);
  const modifiedSet = new Set(diffResult.modifiedComponents);

  // 削除されたコンポーネント（旧配列にのみ存在）
  for (const idx of diffResult.removedComponents) {
    const comp = oldComponents[idx];
    if (comp) {
      nodes.push(makeNode(comp, 'removed'));
    }
  }

  // 新配列を走査して added / modified / unchanged を分類
  newComponents.forEach((comp, idx) => {
    if (addedSet.has(idx)) {
      nodes.push(makeNode(comp, 'added'));
    } else if (modifiedSet.has(idx)) {
      nodes.push(makeNode(comp, 'modified'));
    } else if (!removedSet.has(idx)) {
      nodes.push(makeNode(comp, 'unchanged'));
    }
  });

  return {
    nodes,
    hasChanges: diffResult.hasChanges,
  };
}
