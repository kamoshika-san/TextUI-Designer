/**
 * Semantic diff path resolver.
 *
 * Resolves entity paths produced by the diff engine back to concrete DSL values.
 *
 * Path format (from textui-core-diff.ts):
 *   /page                         → PageDef
 *   /page/components/0            → ComponentDef (top-level)
 *   /page/components/0/fields/1   → ComponentDef (nested via collection slot)
 *   /page/components/0/props/label → scalar property value
 *
 * Supported collection keys: components, fields, actions, items, children
 * (mirrors CHILD_COLLECTION_KEYS in textui-core-diff.ts)
 *
 * Design rules:
 *   - Pure functions only. No side effects.
 *   - Returns null on any resolution failure (malformed path, out-of-bounds index,
 *     unexpected segment). Never throws.
 *   - Does not expose DSL internals; callers interpret the returned value.
 */

import type { TextUIDSL, ComponentDef } from '../domain/dsl-types/component-def';

// -- Types --------------------------------------------------------------------

export type ResolvedPathValue =
  | { kind: 'component'; value: ComponentDef }
  | { kind: 'page' }
  | { kind: 'scalar'; value: unknown }
  | { kind: 'unresolved' };

/** Collection slot keys that may appear as path segments (mirrors core diff). */
const COLLECTION_KEYS = new Set(['components', 'fields', 'actions', 'items', 'children']);

// -- Internal helpers ---------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isComponentDef(value: unknown): value is ComponentDef {
  if (!isRecord(value)) { return false; }
  const keys = Object.keys(value);
  return keys.length === 1;
}

/**
 * Parse a path segment as a non-negative integer index.
 * Returns undefined if the segment is not a valid index.
 */
function parseIndex(segment: string): number | undefined {
  if (!/^\d+$/.test(segment)) { return undefined; }
  return parseInt(segment, 10);
}

// -- Public API ---------------------------------------------------------------

/**
 * Resolve a diff entity path against a DSL document.
 *
 * @param dsl   The DSL document to traverse.
 * @param path  An entity path string like "/page/components/0/fields/1".
 * @returns     A ResolvedPathValue describing what was found, or kind='unresolved'.
 */
export function resolveAtPath(dsl: TextUIDSL, path: string): ResolvedPathValue {
  const segments = path.split('/').filter(s => s.length > 0);

  if (segments.length === 0 || segments[0] !== 'page') {
    return { kind: 'unresolved' };
  }

  if (segments.length === 1) {
    // "/page" → the page itself
    return { kind: 'page' };
  }

  let current: unknown = dsl.page as Record<string, unknown>;
  let i = 1; // skip 'page'

  while (i < segments.length) {
    const segment = segments[i];

    if (!isRecord(current)) {
      return { kind: 'unresolved' };
    }

    if (segment === 'props') {
      // /props/<propertyKey> → scalar value
      i++;
      if (i >= segments.length) { return { kind: 'unresolved' }; }
      const propKey = segments[i];
      const value = (current as Record<string, unknown>)[propKey];
      return { kind: 'scalar', value };
    }

    if (COLLECTION_KEYS.has(segment)) {
      // /<collectionKey>/<index> → element in array
      i++;
      if (i >= segments.length) { return { kind: 'unresolved' }; }
      const index = parseIndex(segments[i]);
      if (index === undefined) { return { kind: 'unresolved' }; }

      const collection = (current as Record<string, unknown>)[segment];
      if (!Array.isArray(collection) || index >= collection.length) {
        return { kind: 'unresolved' };
      }

      const element = collection[index];
      i++;

      // If we've consumed all segments, determine the element kind
      if (i >= segments.length) {
        if (isComponentDef(element)) {
          return { kind: 'component', value: element as ComponentDef };
        }
        return { kind: 'unresolved' };
      }

      // Descend into the element for further traversal.
      // ComponentDef is a branded object { Button: {...} } — unwrap for traversal.
      if (isComponentDef(element)) {
        const componentKey = Object.keys(element as Record<string, unknown>)[0];
        current = (element as Record<string, unknown>)[componentKey];
      } else {
        current = element;
      }
      continue;
    }

    // Unknown segment
    return { kind: 'unresolved' };
  }

  // Ended traversal mid-object without fully resolving to a leaf
  if (isComponentDef(current)) {
    return { kind: 'component', value: current as ComponentDef };
  }
  return { kind: 'unresolved' };
}

/**
 * Convenience wrapper that returns a ComponentDef or null.
 * Suitable for callers that only care about component-level resolution.
 */
export function resolveComponentAtPath(dsl: TextUIDSL, path: string): ComponentDef | null {
  const result = resolveAtPath(dsl, path);
  return result.kind === 'component' ? result.value : null;
}
