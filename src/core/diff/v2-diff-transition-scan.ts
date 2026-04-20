import type { DiffCompareDocument } from './diff-types';
import type { V2DiffRecord, V2EvidenceTransitionEdgeChanged } from './diff-v2-types';
import { buildV2Decision } from './v2-confidence-scorer';

interface TransitionRef {
  key: string;
  from: string;
  to: string;
  trigger: string;
  label?: string;
  condition?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readTransitions(document: DiffCompareDocument): TransitionRef[] {
  const page = (document.normalizedDsl.page as unknown) as Record<string, unknown>;
  const raw = page['transitions'];
  if (!Array.isArray(raw)) return [];
  const result: TransitionRef[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const from = typeof item['from'] === 'string' ? item['from'] : '';
    const to = typeof item['to'] === 'string' ? item['to'] : '';
    const trigger = typeof item['trigger'] === 'string' ? item['trigger'] : '';
    const label = typeof item['label'] === 'string' ? item['label'] : undefined;
    const condition = typeof item['condition'] === 'string' ? item['condition'] : undefined;
    result.push({ key: `${from}→${to}:${trigger}`, from, to, trigger, label, condition });
  }
  return result;
}

function makeTransitionRecord(
  event: 'transition_added' | 'transition_removed',
  targetId: string
): V2DiffRecord {
  return {
    decision: buildV2Decision(event, targetId, 1.0),
    explanation: { evidence: [event === 'transition_added' ? 'transition added' : 'transition removed'] },
  };
}

function makeEdgeChangedRecord(targetId: string, prev: TransitionRef, next: TransitionRef): V2DiffRecord {
  const edgeEvidence: V2EvidenceTransitionEdgeChanged = {
    evidence_shape: 'transition.edge_changed',
    before_label: prev.label,
    after_label: next.label,
    before_condition: prev.condition,
    after_condition: next.condition,
  };
  return {
    decision: buildV2Decision('transition_edge_changed', targetId, 1.0),
    explanation: { evidence: [edgeEvidence] },
  };
}

function transitionEdgeChanged(prev: TransitionRef, next: TransitionRef): boolean {
  return prev.label !== next.label || prev.condition !== next.condition;
}

export function scanTransitionDiffs(
  previous: DiffCompareDocument,
  next: DiffCompareDocument
): V2DiffRecord[] {
  const prevMap = new Map<string, TransitionRef>();
  for (const t of readTransitions(previous)) prevMap.set(t.key, t);

  const nextMap = new Map<string, TransitionRef>();
  for (const t of readTransitions(next)) nextMap.set(t.key, t);

  const result: V2DiffRecord[] = [];

  for (const [key, prev] of prevMap) {
    const nextT = nextMap.get(key);
    if (!nextT) {
      result.push(makeTransitionRecord('transition_removed', key));
    } else if (transitionEdgeChanged(prev, nextT)) {
      result.push(makeEdgeChangedRecord(key, prev, nextT));
    }
  }

  for (const [key] of nextMap) {
    if (!prevMap.has(key)) {
      result.push(makeTransitionRecord('transition_added', key));
    }
  }

  return result;
}
