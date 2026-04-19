import type { DiffCompareDocument } from './diff-types';
import type {
  V2ComponentDiff,
  V2DiffRecord,
} from './diff-v2-types';
import { buildV2Decision } from './v2-confidence-scorer';
import { toComponentNode } from './diff-pairing';

function makeComponentRecord(
  event: 'component_added' | 'component_removed',
  targetId: string
): V2DiffRecord {
  return { decision: buildV2Decision(event, targetId, 1.0), explanation: { evidence: [] } };
}

function buildComponentKey(component: unknown, index: number): string {
  const node = toComponentNode(component);
  if (!node) return `unknown:structural:${index}`;
  const id = typeof node['id'] === 'string' && node['id'] ? node['id'] : undefined;
  return id ? `${node.__kind}:${id}` : `${node.__kind}:structural:${index}`;
}

export function scanComponentDiffs(
  previous: DiffCompareDocument,
  next: DiffCompareDocument
): V2ComponentDiff[] {
  const prevComponents = previous.normalizedDsl.page.components;
  const nextComponents = next.normalizedDsl.page.components;

  const prevMap = new Map<string, number>();
  prevComponents.forEach((c, i) => prevMap.set(buildComponentKey(c, i), i));

  const nextMap = new Map<string, number>();
  nextComponents.forEach((c, i) => nextMap.set(buildComponentKey(c, i), i));

  const result: V2ComponentDiff[] = [];

  for (const [key] of prevMap) {
    if (!nextMap.has(key)) {
      result.push({
        component_id: key,
        diffs: [makeComponentRecord('component_removed', key)],
      });
    }
  }

  for (const [key] of nextMap) {
    if (!prevMap.has(key)) {
      result.push({
        component_id: key,
        diffs: [makeComponentRecord('component_added', key)],
      });
    }
  }

  return result;
}
