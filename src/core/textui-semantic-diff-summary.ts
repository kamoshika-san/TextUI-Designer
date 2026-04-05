/**
 * D4: Semantic diff summary — one-line change descriptions.
 *
 * Transforms a DiffCompareResult + DiffReviewImpactResult into a flat list of
 * human-readable one-line descriptions, one per diff event.
 *
 * Output format:
 *   prefix  text
 *   +        Primary Button "Save" を追加
 *   ~        Form layout を変更 ("vertical" → "horizontal")
 *   -        Alert (warning) を削除
 *   ?        Modal が置き換え（要確認）
 *
 * Design rules:
 *   - Pure functions. No side effects.
 *   - DSL internals (type keys, path segments, raw prop names) are never exposed.
 *   - Property-level events describe the parent component + changed property.
 *   - When component resolution fails (out-of-bounds, malformed path), a safe
 *     fallback label derived from the event metadata is used.
 *   - One SemanticSummaryLine is produced for every DiffEvent (1:1 mapping).
 */

import type {
  DiffCompareResult,
  DiffEvent,
  DiffEventKind,
  DiffEntityKind,
} from './textui-core-diff';
import type { DiffReviewImpactResult, DiffSummarySeverity } from './textui-diff-review-impact';
import type { ComponentDef } from '../domain/dsl-types/component-def';
import type { TextUIDSL } from '../domain/dsl-types/dsl-types';
import { resolveAtPath, resolveComponentAtPath } from './textui-semantic-path-resolver';
import { normalizeComponentVocabulary } from './textui-component-vocabulary';

// -- Output types -------------------------------------------------------------

export type SemanticChangePrefix = '+' | '~' | '-' | '?';

export interface SemanticSummaryLine {
  /** Source event identifier (one-to-one with DiffEvent). */
  eventId: string;
  /** Change symbol: + add, ~ update/reorder/move/rename, - remove, ? ambiguous */
  prefix: SemanticChangePrefix;
  /** Full human-readable one-line description. */
  text: string;
  /**
   * Component type (e.g., "Button", "Form"). Undefined for page-level events.
   * Used by UI layers for icon resolution; never shown as a raw label.
   */
  componentType?: string;
  /**
   * Human-readable display name (e.g., "Primary Button", "Alert (warning)").
   * Undefined for page-level events and unresolvable paths.
   */
  displayName?: string;
  /** Severity from D2-1 classification (for display prioritization). */
  severity: DiffSummarySeverity;
}

export interface SemanticSummaryResult {
  kind: 'semantic-summary-result/v0';
  lines: SemanticSummaryLine[];
  metadata: {
    totalLines: number;
    additions: number;
    removals: number;
    updates: number;
    ambiguous: number;
  };
}

// -- Internal helpers ---------------------------------------------------------

function prefixOf(kind: DiffEventKind): SemanticChangePrefix {
  switch (kind) {
    case 'add':       return '+';
    case 'remove':    return '-';
    case 'remove+add': return '?';
    default:          return '~'; // update, reorder, move, rename
  }
}

/**
 * Format a scalar value for display in a change description.
 * Truncates long strings, wraps in quotes.
 */
function formatScalar(value: unknown): string {
  if (value === null || value === undefined) { return '(none)'; }
  if (typeof value === 'boolean') { return value ? 'true' : 'false'; }
  if (typeof value === 'number') { return String(value); }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length === 0) { return '(empty)'; }
    const truncated = trimmed.length > 50 ? trimmed.slice(0, 50) + '…' : trimmed;
    return `"${truncated}"`;
  }
  return String(value);
}

/**
 * Returns true when two scalar values are considered identical for diff purposes.
 * Handles undefined/null symmetrically and uses strict equality for primitives.
 */
function scalarIsIdentical(a: unknown, b: unknown): boolean {
  if (a === undefined && b === undefined) { return true; }
  if (a === null && b === null) { return true; }
  if (a === undefined || a === null || b === undefined || b === null) { return false; }
  if (typeof a === 'string' && typeof b === 'string') {
    return a.trim() === b.trim();
  }
  return a === b;
}

/**
 * Compute the set of event IDs that should be suppressed from the summary.
 *
 * Three-pass suppression strategy:
 *
 * Pass 1 — Scalar-level noise:
 *   - Page entity `update` at path `/page` (always fires; no useful content).
 *   - Property `update` where prevScalar === nextScalar (normalization artifact).
 *
 * Pass 1.5 — Property children of non-update component events:
 *   - `add` components: property children are always `(none) → value` — the
 *     parent `+ Component を追加` line already conveys the addition.
 *   - `remove` / `remove+add` components: same reasoning as add.
 *   - `reorder` / `move` components: property children show `(none) → value`
 *     because the path changed; they are path-change artifacts, not real edits.
 *
 * Pass 2 — Redundant component `update` lines:
 *   - When a component `update` event has active (unsuppressed) property
 *     children, the property lines are more specific — suppress the parent.
 *   - When a component `update` event has no active children AND the resolved
 *     vocabulary is identical before and after, suppress it (no visible change).
 */
function computeSuppressedEventIds(
  events: DiffEvent[],
  previousDsl: TextUIDSL,
  nextDsl: TextUIDSL
): Set<string> {
  const suppressed = new Set<string>();

  // ── Pass 1 ──────────────────────────────────────────────────────────────────
  // Paths of components whose property children should be suppressed.
  // Populated here; applied in Pass 1.5.
  const suppressChildrenOfPaths = new Set<string>();

  for (const event of events) {
    // Suppress page entity update events (always-present noise)
    if (event.entityKind === 'page' && event.kind === 'update') {
      const path = event.trace.nextSourceRef?.entityPath
        ?? event.trace.previousSourceRef?.entityPath
        ?? '';
      if (path === '/page') {
        suppressed.add(event.eventId);
        continue;
      }
    }

    // Suppress property update events where the scalar value is unchanged
    if (event.kind === 'update' && event.entityKind === 'property') {
      const rawPath = event.trace.nextSourceRef?.entityPath
        ?? event.trace.previousSourceRef?.entityPath
        ?? '';
      const prevResult = rawPath ? resolveAtPath(previousDsl, rawPath) : null;
      const nextResult = rawPath ? resolveAtPath(nextDsl, rawPath) : null;
      const prevScalar = prevResult?.kind === 'scalar' ? prevResult.value : undefined;
      const nextScalar = nextResult?.kind === 'scalar' ? nextResult.value : undefined;
      if (scalarIsIdentical(prevScalar, nextScalar)) {
        suppressed.add(event.eventId);
        continue;
      }
    }

    // Collect component paths for add / remove / remove+add / reorder / move.
    // Property children of these events are either redundant with the parent
    // line or are path-change artifacts produced by the diff engine.
    if (event.entityKind === 'component' && event.kind !== 'update') {
      const compPath = event.kind === 'remove'
        ? (event.trace.previousSourceRef?.entityPath ?? '')
        : (event.trace.nextSourceRef?.entityPath
            ?? event.trace.previousSourceRef?.entityPath
            ?? '');
      if (compPath) {
        suppressChildrenOfPaths.add(compPath);
      }
    }
  }

  // ── Pass 1.5 ─────────────────────────────────────────────────────────────────
  // Suppress property events whose parent component is in suppressChildrenOfPaths.
  for (const event of events) {
    if (suppressed.has(event.eventId)) { continue; }
    if (event.entityKind !== 'property') { continue; }
    const rawPath = event.trace.nextSourceRef?.entityPath
      ?? event.trace.previousSourceRef?.entityPath
      ?? '';
    const split = splitPropertyPath(rawPath);
    if (split && suppressChildrenOfPaths.has(split.componentPath)) {
      suppressed.add(event.eventId);
    }
  }

  // ── Pass 2 ──────────────────────────────────────────────────────────────────
  // Suppress component-level update events that are redundant.
  for (const event of events) {
    if (suppressed.has(event.eventId)) { continue; }
    if (event.kind !== 'update' || event.entityKind !== 'component') { continue; }

    const pathA = event.trace.previousSourceRef?.entityPath ?? '';
    const pathB = event.trace.nextSourceRef?.entityPath ?? '';
    const componentPath = pathB || pathA;

    // If there are active (unsuppressed) property children, the property lines
    // are more specific — suppress the parent component update line.
    const hasActiveChildren = events.some(child =>
      !suppressed.has(child.eventId) &&
      child.eventId !== event.eventId &&
      child.entityKind === 'property' &&
      (() => {
        const childPath = child.trace.nextSourceRef?.entityPath
          ?? child.trace.previousSourceRef?.entityPath
          ?? '';
        return childPath.startsWith(componentPath + '/');
      })()
    );
    if (hasActiveChildren) {
      suppressed.add(event.eventId);
      continue;
    }

    // No active children — suppress if vocabulary is identical (nothing visible changed).
    const compA = pathA ? resolveComponentAtPath(previousDsl, pathA) : null;
    const compB = pathB ? resolveComponentAtPath(nextDsl, pathB) : null;
    if (compA && compB) {
      const vocabA = normalizeComponentVocabulary(compA);
      const vocabB = normalizeComponentVocabulary(compB);
      if (vocabA.displayName === vocabB.displayName && vocabA.labelText === vocabB.labelText) {
        suppressed.add(event.eventId);
      }
    }
  }

  return suppressed;
}

/**
 * Extract the parent component path and property key from a property path.
 * Property paths have the form: <componentPath>/props/<propertyKey>
 * Returns null if the path does not follow this pattern.
 */
function splitPropertyPath(path: string): { componentPath: string; propKey: string } | null {
  const propsIndex = path.lastIndexOf('/props/');
  if (propsIndex < 0) { return null; }
  const componentPath = path.slice(0, propsIndex);
  const propKey = path.slice(propsIndex + '/props/'.length);
  if (!componentPath || !propKey) { return null; }
  return { componentPath, propKey };
}

/**
 * Map a raw DSL property key to a human-readable display label.
 * Prevents internal field names from surfacing in the UI.
 */
function humanizePropKey(propKey: string): string {
  const labels: Record<string, string> = {
    label:       'label',
    title:       'title',
    value:       'value',
    message:     'message',
    placeholder: 'placeholder',
    kind:        'style',
    variant:     'variant',
    layout:      'layout',
    type:        'type',
    disabled:    'disabled state',
    required:    'required state',
    open:        'open state',
    href:        'link URL',
    src:         'image source',
    alt:         'alt text',
    name:        'field name',
    size:        'size',
    checked:     'checked state',
    multiple:    'multi-select',
    striped:     'striped rows',
    rowHover:    'row hover',
    allowMultiple: 'allow multiple',
    defaultTab:  'default tab',
    showLines:   'show lines',
    expandAll:   'expand all',
    showValue:   'show value',
    orientation: 'orientation',
    spacing:     'spacing',
    axis:        'axis',
    width:       'width',
    height:      'height',
    flexGrow:    'flex grow',
    minWidth:    'minimum width',
    body:        'body text',
    target:      'link target',
    separator:   'separator',
    weight:      'font weight',
    color:       'color',
    min:         'minimum date',
    max:         'maximum date',
  };
  return labels[propKey] ?? propKey;
}

// -- Line builders ------------------------------------------------------------

function buildComponentLine(
  event: DiffEvent,
  dsl: TextUIDSL,
  severity: DiffSummarySeverity
): SemanticSummaryLine {
  // Prefer next path for add/update, previous path for remove
  const path = event.kind === 'remove'
    ? (event.trace.previousSourceRef?.entityPath ?? '')
    : (event.trace.nextSourceRef?.entityPath ?? event.trace.previousSourceRef?.entityPath ?? '');

  const comp: ComponentDef | null = path ? resolveComponentAtPath(dsl, path) : null;

  if (!comp) {
    return buildFallbackLine(event, severity);
  }

  const vocab = normalizeComponentVocabulary(comp);
  const subject = vocab.labelText
    ? `${vocab.displayName} "${vocab.labelText}"`
    : vocab.displayName;

  const text = buildComponentText(event.kind, subject);

  return {
    eventId: event.eventId,
    prefix: prefixOf(event.kind),
    text,
    componentType: vocab.componentType,
    displayName: vocab.displayName,
    severity,
  };
}

function buildComponentText(kind: DiffEventKind, subject: string): string {
  switch (kind) {
    case 'add':       return `${subject} を追加`;
    case 'remove':    return `${subject} を削除`;
    case 'update':    return `${subject} を更新`;
    case 'reorder':   return `${subject} を並び替え`;
    case 'move':      return `${subject} を移動`;
    case 'rename':    return `${subject} を名称変更`;
    case 'remove+add': return `${subject} が置き換え（要確認）`;
  }
}

function buildPropertyLine(
  event: DiffEvent,
  previousDsl: TextUIDSL,
  nextDsl: TextUIDSL,
  severity: DiffSummarySeverity
): SemanticSummaryLine {
  // Use next path for add/update, previous for remove; property update events share same path
  const rawPath = event.trace.nextSourceRef?.entityPath
    ?? event.trace.previousSourceRef?.entityPath
    ?? '';

  const split = splitPropertyPath(rawPath);
  if (!split) {
    return buildFallbackLine(event, severity);
  }

  const { componentPath, propKey } = split;

  // Resolve parent component from the appropriate side
  const componentDsl = event.kind === 'remove' ? previousDsl : nextDsl;
  const comp = resolveComponentAtPath(componentDsl, componentPath);

  // Resolve property values from each side
  const prevValue = event.trace.previousSourceRef?.entityPath
    ? resolveAtPath(previousDsl, event.trace.previousSourceRef.entityPath)
    : null;
  const nextValue = event.trace.nextSourceRef?.entityPath
    ? resolveAtPath(nextDsl, event.trace.nextSourceRef.entityPath)
    : null;

  const propLabel = humanizePropKey(propKey);

  if (!comp) {
    // Can't resolve parent component — build property-only description
    const changeDesc = buildPropertyChangeDesc(event.kind, propLabel, prevValue?.kind === 'scalar' ? prevValue.value : undefined, nextValue?.kind === 'scalar' ? nextValue.value : undefined);
    return {
      eventId: event.eventId,
      prefix: prefixOf(event.kind),
      text: changeDesc,
      severity,
    };
  }

  const vocab = normalizeComponentVocabulary(comp);
  const prevScalar = prevValue?.kind === 'scalar' ? prevValue.value : undefined;
  const nextScalar = nextValue?.kind === 'scalar' ? nextValue.value : undefined;

  const text = `${vocab.displayName} の ${propLabel} を変更 (${formatScalar(prevScalar)} → ${formatScalar(nextScalar)})`;

  return {
    eventId: event.eventId,
    prefix: '~',
    text,
    componentType: vocab.componentType,
    displayName: vocab.displayName,
    severity,
  };
}

function buildPropertyChangeDesc(
  kind: DiffEventKind,
  propLabel: string,
  prevValue: unknown,
  nextValue: unknown
): string {
  if (kind === 'add') {
    return `${propLabel} を追加 (${formatScalar(nextValue)})`;
  }
  if (kind === 'remove') {
    return `${propLabel} を削除 (${formatScalar(prevValue)})`;
  }
  return `${propLabel} を変更 (${formatScalar(prevValue)} → ${formatScalar(nextValue)})`;
}

function buildPageLine(
  event: DiffEvent,
  previousDsl: TextUIDSL,
  nextDsl: TextUIDSL,
  severity: DiffSummarySeverity
): SemanticSummaryLine {
  // Page-level property update (e.g., title or layout)
  if (event.entityKind === 'property') {
    const rawPath = event.trace.nextSourceRef?.entityPath
      ?? event.trace.previousSourceRef?.entityPath
      ?? '';
    const split = splitPropertyPath(rawPath);
    if (split) {
      const propLabel = humanizePropKey(split.propKey);
      const prevResult = resolveAtPath(previousDsl, rawPath);
      const nextResult = resolveAtPath(nextDsl, rawPath);
      const prevVal = prevResult.kind === 'scalar' ? prevResult.value : undefined;
      const nextVal = nextResult.kind === 'scalar' ? nextResult.value : undefined;
      const text = `Page ${propLabel} を変更 (${formatScalar(prevVal)} → ${formatScalar(nextVal)})`;
      return { eventId: event.eventId, prefix: '~', text, severity };
    }
  }

  const text = buildComponentText(event.kind, 'Page');
  return { eventId: event.eventId, prefix: prefixOf(event.kind), text, severity };
}

function buildFallbackLine(
  event: DiffEvent,
  severity: DiffSummarySeverity
): SemanticSummaryLine {
  const entityLabel = event.entityKind === 'component' ? 'Component'
    : event.entityKind === 'property' ? 'Property'
    : 'Page';

  const text = buildComponentText(event.kind, entityLabel);
  return {
    eventId: event.eventId,
    prefix: prefixOf(event.kind),
    text,
    severity,
  };
}

function buildLine(
  event: DiffEvent,
  previousDsl: TextUIDSL,
  nextDsl: TextUIDSL,
  severity: DiffSummarySeverity
): SemanticSummaryLine {
  const entityKind: DiffEntityKind = event.entityKind;

  if (entityKind === 'page') {
    return buildPageLine(event, previousDsl, nextDsl, severity);
  }

  if (entityKind === 'property') {
    // Determine if this is a page property or a component property
    const path = event.trace.nextSourceRef?.entityPath
      ?? event.trace.previousSourceRef?.entityPath
      ?? '';
    const split = splitPropertyPath(path);
    // If the component path resolves to '/page', it's a page property
    if (split && split.componentPath === '/page') {
      return buildPageLine(event, previousDsl, nextDsl, severity);
    }
    return buildPropertyLine(event, previousDsl, nextDsl, severity);
  }

  // entityKind === 'component'
  const dsl = event.kind === 'remove' ? previousDsl : nextDsl;
  return buildComponentLine(event, dsl, severity);
}

// -- Public API ---------------------------------------------------------------

/**
 * Build semantic one-line summaries for all events in a diff result.
 *
 * @param compareResult  Internal diff result from createDiffResultSkeleton().
 * @param reviewImpact   D2-1 classification for severity lookup.
 * @returns              SemanticSummaryResult with one line per diff event.
 */
export function buildSemanticSummary(
  compareResult: DiffCompareResult,
  reviewImpact: DiffReviewImpactResult
): SemanticSummaryResult {
  const previousDsl = compareResult.input.previous.normalizedDsl;
  const nextDsl = compareResult.input.next.normalizedDsl;

  const impactBySeverity = new Map<string, DiffSummarySeverity>(
    reviewImpact.impacts.map(impact => [impact.eventId, impact.severity])
  );

  // Compute suppression set before building lines
  const suppressed = computeSuppressedEventIds(compareResult.events, previousDsl, nextDsl);

  const lines: SemanticSummaryLine[] = compareResult.events
    .filter(event => !suppressed.has(event.eventId))
    .map(event => {
      const severity = impactBySeverity.get(event.eventId) ?? 's0-minor';
      return buildLine(event, previousDsl, nextDsl, severity);
    });

  const additions = lines.filter(l => l.prefix === '+').length;
  const removals = lines.filter(l => l.prefix === '-').length;
  const ambiguous = lines.filter(l => l.prefix === '?').length;
  const updates = lines.length - additions - removals - ambiguous;

  return {
    kind: 'semantic-summary-result/v0',
    lines,
    metadata: {
      totalLines: lines.length,
      additions,
      removals,
      updates,
      ambiguous,
    },
  };
}
