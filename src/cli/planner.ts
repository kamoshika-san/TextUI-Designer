import type { PlanChange, PlanResult, CliState, ComponentResourceRecord } from './types';
import { sha256, stableStringify } from './utils';

type ComponentRecord = ComponentResourceRecord;

function normalizeSnapshot(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function getChangedFields(prevSnapshot?: Record<string, unknown>, nextSnapshot?: Record<string, unknown>): string[] {
  if (!prevSnapshot || !nextSnapshot) {
    return [];
  }

  const keys = new Set([...Object.keys(prevSnapshot), ...Object.keys(nextSnapshot)]);
  return Array.from(keys)
    .filter(key => stableStringify(prevSnapshot[key]) !== stableStringify(nextSnapshot[key]))
    .sort((a, b) => a.localeCompare(b));
}

function buildChangeDetails(prev: ComponentRecord, next: ComponentRecord): string {
  const details: string[] = [];

  if (prev.type !== next.type) {
    details.push(`type changed: ${prev.type} -> ${next.type}`);
  }
  if (prev.path !== next.path) {
    details.push(`path changed: ${prev.path} -> ${next.path}`);
  }

  const changedFields = getChangedFields(prev.snapshot, next.snapshot);
  if (changedFields.length > 0) {
    details.push(`fields changed: ${changedFields.join(', ')}`);
  }

  return details.join(' | ') || 'content changed';
}

export function extractComponentRecords(dsl: unknown): ComponentRecord[] {
  const components = ((dsl as { page?: { components?: unknown[] } })?.page?.components ?? []);
  if (!Array.isArray(components)) {
    return [];
  }

  return components
    .map((component, index): ComponentRecord | null => {
      if (!component || typeof component !== 'object') {
        return null;
      }
      const [type] = Object.keys(component as Record<string, unknown>);
      if (!type) {
        return null;
      }
      const props = (component as Record<string, unknown>)[type] as Record<string, unknown> | undefined;
      const id = typeof props?.id === 'string'
        ? props.id
        : `${type}:${index}:${sha256(stableStringify(props)).slice(0, 16)}`;
      return {
        id,
        type,
        path: `page.components[${index}]`,
        hash: sha256(stableStringify(props)),
        snapshot: normalizeSnapshot(props)
      };
    })
    .filter((record): record is ComponentRecord => record !== null);
}

export function buildPlan(dsl: unknown, state: CliState | null): PlanResult {
  const nextRecords = extractComponentRecords(dsl);
  const prevRecords = state?.resources ?? [];

  const prevById = new Map(prevRecords.map(record => [record.id, record]));
  const nextById = new Map(nextRecords.map(record => [record.id, record]));

  const changes: PlanChange[] = [];

  for (const next of nextRecords) {
    const prev = prevById.get(next.id);
    if (!prev) {
      changes.push({ op: '+', id: next.id, type: next.type, path: next.path });
      continue;
    }

    if (prev.hash !== next.hash || prev.path !== next.path || prev.type !== next.type) {
      changes.push({
        op: '~',
        id: next.id,
        type: next.type,
        path: next.path,
        details: buildChangeDetails(prev, next)
      });
    }
  }

  for (const prev of prevRecords) {
    if (!nextById.has(prev.id)) {
      changes.push({ op: '-', id: prev.id, type: prev.type, path: prev.path });
    }
  }

  return {
    hasChanges: changes.length > 0,
    changes
  };
}
