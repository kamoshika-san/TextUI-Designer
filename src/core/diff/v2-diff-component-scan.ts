import type { DiffCompareDocument } from './diff-types';
import type {
  V2ComponentDiff,
  V2DiffRecord,
  V2EvidenceItem,
  V2EvidenceComponentChanged,
} from './diff-v2-types';
import { buildV2Decision } from './v2-confidence-scorer';
import { toComponentNode } from './diff-pairing';
import { normalizeDefaults } from '../diff-normalization/normalize-defaults';

function makeComponentRecord(
  event:
    | 'component_added'
    | 'component_removed'
    | 'component_action_changed'
    | 'component_availability_changed'
    | 'component_guard_changed',
  targetId: string,
  beforePredicate?: unknown,
  afterPredicate?: unknown,
  confidence = 1.0,
  ambiguityReason?: string,
  evidence?: V2EvidenceItem[]
): V2DiffRecord {
  const defaultEvidence: V2EvidenceComponentChanged = { evidence_shape: 'component.changed', event };
  return {
    decision: buildV2Decision(event, targetId, confidence, ambiguityReason),
    explanation: {
      evidence: evidence ?? [defaultEvidence],
      before_predicate: beforePredicate,
      after_predicate: afterPredicate,
    },
  };
}

function buildComponentKey(component: unknown, index: number): string {
  const node = toComponentNode(component);
  if (!node) {
    return `unknown:structural:${index}`;
  }
  const id = typeof node['id'] === 'string' && node['id'] ? node['id'] : undefined;
  return id ? `${node.__kind}:${id}` : `${node.__kind}:structural:${index}`;
}

function getNormalizedComponentNode(component: unknown): Record<string, unknown> & { __kind: string } | undefined {
  const node = toComponentNode(component);
  if (!node) {
    return undefined;
  }

  return {
    ...node,
    ...((normalizeDefaults(node) as unknown) as Record<string, unknown>),
  };
}

function extractActionAxis(component: unknown): { domain: 'none' | 'submit' | 'trigger'; type: string } {
  const node = getNormalizedComponentNode(component);
  if (!node) {
    return { domain: 'none', type: 'none' };
  }

  const action = node['action'];
  if (action && typeof action === 'object' && !Array.isArray(action)) {
    const trigger = (action as Record<string, unknown>)['trigger'];
    if (typeof trigger === 'string' && trigger.trim().length > 0) {
      return { domain: 'trigger', type: trigger.trim() };
    }
  }

  if (node['submit'] === true) {
    return { domain: 'submit', type: 'submit' };
  }

  return { domain: 'none', type: 'none' };
}

function extractAvailabilityAxis(component: unknown): {
  visibility: 'visible' | 'hidden';
  enabled: 'enabled' | 'disabled';
  editability: 'editable' | 'readonly';
} {
  const node = getNormalizedComponentNode(component);
  if (!node) {
    return {
      visibility: 'visible',
      enabled: 'enabled',
      editability: 'editable',
    };
  }

  const visible = node['visible'] !== false;
  const enabled = node['disabled'] !== true;
  const editable = node['editable'] === false
    ? false
    : !(node['readOnly'] === true || node['readonly'] === true);

  return {
    visibility: visible ? 'visible' : 'hidden',
    enabled: enabled ? 'enabled' : 'disabled',
    editability: editable ? 'editable' : 'readonly',
  };
}

function stableGuardStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(item => stableGuardStringify(item)).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => `${JSON.stringify(key)}:${stableGuardStringify(nested)}`);
    return `{${entries.join(',')}}`;
  }
  return JSON.stringify(value);
}

type NormalizedGuard =
  | {
    kind: 'unresolved';
    reason: string;
    candidates?: string[];
  }
  | {
    op: 'eq' | 'ne' | 'in' | 'exists';
    fact: string;
    value?: string | number | boolean;
  }
  | {
    op: 'all_of';
    all_of: NormalizedGuard[];
  }
  | {
    op: 'any_of';
    any_of: NormalizedGuard[];
  }
  | {
    op: 'not';
    not: NormalizedGuard;
  };

function normalizeUnresolvedGuard(value: Record<string, unknown>, reason = 'invalid_guard_shape'): NormalizedGuard {
  const candidateValues = value['candidates'];
  const candidates = Array.isArray(candidateValues)
    ? candidateValues
      .filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
      .map(entry => entry.trim())
      .sort((left, right) => left.localeCompare(right))
    : undefined;
  return {
    kind: 'unresolved',
    reason: typeof value['reason'] === 'string' && value['reason'].trim().length > 0
      ? value['reason'].trim()
      : reason,
    ...(candidates && candidates.length > 0 ? { candidates } : {}),
  };
}

function normalizeGuardValue(value: unknown): string | number | boolean | undefined {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  return undefined;
}

function normalizeGuardPredicate(value: unknown, depth = 0): NormalizedGuard | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  if (record['kind'] === 'unresolved') {
    return normalizeUnresolvedGuard(record);
  }

  const op = typeof record['op'] === 'string' ? record['op'] : undefined;
  if (!op) {
    return normalizeUnresolvedGuard(record);
  }

  switch (op) {
    case 'eq':
    case 'ne':
    case 'in':
    case 'exists': {
      const fact = typeof record['fact'] === 'string' ? record['fact'].trim() : '';
      if (!fact) {
        return normalizeUnresolvedGuard(record, 'invalid_atomic_guard');
      }
      const normalizedValue = normalizeGuardValue(record['value']);
      return normalizedValue === undefined
        ? { op, fact }
        : { op, fact, value: normalizedValue };
    }
    case 'all_of':
    case 'any_of': {
      if (depth >= 4) {
        return normalizeUnresolvedGuard(record, 'guard_depth_exceeded');
      }
      const rawChildren = record[op];
      if (!Array.isArray(rawChildren) || rawChildren.length === 0) {
        return normalizeUnresolvedGuard(record, 'invalid_logical_guard');
      }
      const children = rawChildren
        .map(child => normalizeGuardPredicate(child, depth + 1))
        .filter((child): child is NormalizedGuard => child !== undefined)
        .sort((left, right) => stableGuardStringify(left).localeCompare(stableGuardStringify(right)));
      if (children.length === 0) {
        return normalizeUnresolvedGuard(record, 'invalid_logical_guard');
      }
      if (children.length === 1) {
        return children[0];
      }
      return op === 'all_of'
        ? { op: 'all_of', all_of: children }
        : { op: 'any_of', any_of: children };
    }
    case 'not': {
      if (depth >= 4) {
        return normalizeUnresolvedGuard(record, 'guard_depth_exceeded');
      }
      const normalizedChild = normalizeGuardPredicate(record['not'], depth + 1);
      if (!normalizedChild) {
        return normalizeUnresolvedGuard(record, 'invalid_not_guard');
      }
      if ('op' in normalizedChild && normalizedChild.op === 'not') {
        return normalizedChild.not;
      }
      return { op: 'not', not: normalizedChild };
    }
    default:
      return normalizeUnresolvedGuard(record);
  }
}

function hasUnresolvedGuard(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some(hasUnresolvedGuard);
  }
  if (!value || typeof value !== 'object') {
    return false;
  }
  const record = value as Record<string, unknown>;
  if (record['kind'] === 'unresolved') {
    return true;
  }
  return Object.values(record).some(hasUnresolvedGuard);
}

export function scanComponentDiffs(
  previous: DiffCompareDocument,
  next: DiffCompareDocument
): V2ComponentDiff[] {
  const prevComponents = previous.normalizedDsl.page.components;
  const nextComponents = next.normalizedDsl.page.components;

  const prevMap = new Map<string, { index: number; component: unknown }>();
  prevComponents.forEach((c, i) => prevMap.set(buildComponentKey(c, i), { index: i, component: c }));

  const nextMap = new Map<string, { index: number; component: unknown }>();
  nextComponents.forEach((c, i) => nextMap.set(buildComponentKey(c, i), { index: i, component: c }));

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

  for (const [key, previousEntry] of prevMap) {
    const nextEntry = nextMap.get(key);
    if (!nextEntry) {
      continue;
    }

    const prevAction = extractActionAxis(previousEntry.component);
    const nextAction = extractActionAxis(nextEntry.component);
    if (prevAction.domain !== nextAction.domain || prevAction.type !== nextAction.type) {
      result.push({
        component_id: key,
        diffs: [makeComponentRecord('component_action_changed', key, prevAction, nextAction)],
      });
    }

    const prevAvailability = extractAvailabilityAxis(previousEntry.component);
    const nextAvailability = extractAvailabilityAxis(nextEntry.component);
    if (
      prevAvailability.visibility !== nextAvailability.visibility
      || prevAvailability.enabled !== nextAvailability.enabled
      || prevAvailability.editability !== nextAvailability.editability
    ) {
      result.push({
        component_id: key,
        diffs: [makeComponentRecord('component_availability_changed', key, prevAvailability, nextAvailability)],
      });
    }

    const previousGuard = getNormalizedComponentNode(previousEntry.component)?.['guard'];
    const nextGuard = getNormalizedComponentNode(nextEntry.component)?.['guard'];
    const normalizedPreviousGuard = normalizeGuardPredicate(previousGuard);
    const normalizedNextGuard = normalizeGuardPredicate(nextGuard);
    if (stableGuardStringify(normalizedPreviousGuard) !== stableGuardStringify(normalizedNextGuard)) {
      const unresolved = hasUnresolvedGuard(previousGuard)
        || hasUnresolvedGuard(nextGuard)
        || hasUnresolvedGuard(normalizedPreviousGuard)
        || hasUnresolvedGuard(normalizedNextGuard);
      result.push({
        component_id: key,
        diffs: [makeComponentRecord(
          'component_guard_changed',
          key,
          normalizedPreviousGuard,
          normalizedNextGuard,
          unresolved ? 0.7 : 1.0,
          unresolved ? 'guard contains unresolved predicate' : undefined
        )],
      });
    }
  }

  return result.sort((left, right) => left.component_id.localeCompare(right.component_id));
}
