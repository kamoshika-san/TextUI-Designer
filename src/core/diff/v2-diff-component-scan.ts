import type { DiffCompareDocument } from './diff-types';
import type {
  V2ComponentDiff,
  V2DiffRecord,
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
  ambiguityReason?: string
): V2DiffRecord {
  return {
    decision: buildV2Decision(event, targetId, confidence, ambiguityReason),
    explanation: {
      evidence: [],
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
    if (stableGuardStringify(previousGuard) !== stableGuardStringify(nextGuard)) {
      const unresolved = hasUnresolvedGuard(previousGuard) || hasUnresolvedGuard(nextGuard);
      result.push({
        component_id: key,
        diffs: [makeComponentRecord(
          'component_guard_changed',
          key,
          previousGuard,
          nextGuard,
          unresolved ? 0.7 : 1.0,
          unresolved ? 'guard contains unresolved predicate' : undefined
        )],
      });
    }
  }

  return result;
}
