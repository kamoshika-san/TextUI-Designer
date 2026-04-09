import * as fs from 'fs';
import * as path from 'path';
import { isNavigationFlowDSL } from '../domain/dsl-types';
import type { ValidationIssue } from '../cli/types';
import { NAV_ERROR_CODES } from './nav-error-codes';

export function validateNavigationFlow(
  dsl: unknown,
  options: { sourcePath?: string } = {}
): ValidationIssue[] {
  if (!isNavigationFlowDSL(dsl)) {
    return [];
  }

  const issues: ValidationIssue[] = [];
  const screens = dsl.flow.screens;
  const transitions = dsl.flow.transitions;
  const screenIds = new Set<string>();
  const screenIndexById = new Map<string, number>();
  const duplicateIds = new Set<string>();

  screens.forEach((screen, index) => {
    const existingIndex = screenIndexById.get(screen.id);
    if (existingIndex !== undefined) {
      if (!duplicateIds.has(screen.id)) {
        issues.push({
          level: 'error',
          code: NAV_ERROR_CODES.DUPLICATE_SCREEN_ID,
          message: `Duplicate screen id: ${screen.id}`,
          path: `/flow/screens/${existingIndex}/id`
        });
        duplicateIds.add(screen.id);
      }

      issues.push({
        level: 'error',
        code: NAV_ERROR_CODES.DUPLICATE_SCREEN_ID,
        message: `Duplicate screen id: ${screen.id}`,
        path: `/flow/screens/${index}/id`
      });
      return;
    }

    screenIds.add(screen.id);
    screenIndexById.set(screen.id, index);

    if (!options.sourcePath) {
      return;
    }

    const resolvedPagePath = path.resolve(path.dirname(options.sourcePath), screen.page);
    if (!fs.existsSync(resolvedPagePath)) {
      issues.push({
        level: 'error',
        code: NAV_ERROR_CODES.PAGE_NOT_FOUND,
        message: `Referenced page file was not found: ${screen.page}`,
        path: `/flow/screens/${index}/page`
      });
    }
  });

  if (!screenIds.has(dsl.flow.entry)) {
    issues.push({
      level: 'error',
      code: NAV_ERROR_CODES.ENTRY_NOT_FOUND,
      message: `Entry screen was not found in screens: ${dsl.flow.entry}`,
      path: '/flow/entry'
    });
  }

  transitions.forEach((transition, index) => {
    if (!screenIds.has(transition.from)) {
      issues.push({
        level: 'error',
        code: NAV_ERROR_CODES.TRANSITION_ENDPOINT_NOT_FOUND,
        message: `Transition source screen was not found: ${transition.from}`,
        path: `/flow/transitions/${index}/from`
      });
    }

    if (!screenIds.has(transition.to)) {
      issues.push({
        level: 'error',
        code: NAV_ERROR_CODES.TRANSITION_ENDPOINT_NOT_FOUND,
        message: `Transition destination screen was not found: ${transition.to}`,
        path: `/flow/transitions/${index}/to`
      });
    }
  });

  const adjacency = new Map<string, string[]>();
  screens.forEach(screen => adjacency.set(screen.id, []));
  transitions.forEach(transition => {
    if (screenIds.has(transition.from) && screenIds.has(transition.to)) {
      adjacency.get(transition.from)?.push(transition.to);
    }
  });

  for (const cycle of findCycles(adjacency)) {
    issues.push({
      level: 'error',
      code: NAV_ERROR_CODES.CYCLE_DETECTED,
      message: `Circular navigation path detected: ${cycle.join(' -> ')}`,
      path: '/flow/transitions'
    });
  }

  if (screenIds.has(dsl.flow.entry)) {
    const reachable = collectReachable(adjacency, dsl.flow.entry);
    screens.forEach((screen, index) => {
      if (!reachable.has(screen.id)) {
        issues.push({
          level: 'warning',
          code: NAV_ERROR_CODES.UNREACHABLE_SCREEN,
          message: `Screen is unreachable from entry: ${screen.id}`,
          path: `/flow/screens/${index}/id`
        });
      }
    });
  }

  return issues;
}

function collectReachable(adjacency: Map<string, string[]>, entry: string): Set<string> {
  const visited = new Set<string>();
  const queue = [entry];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || visited.has(current)) {
      continue;
    }

    visited.add(current);
    for (const next of adjacency.get(current) ?? []) {
      if (!visited.has(next)) {
        queue.push(next);
      }
    }
  }

  return visited;
}

function findCycles(adjacency: Map<string, string[]>): string[][] {
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const stack: string[] = [];
  const cycles: string[][] = [];
  const seen = new Set<string>();

  const visit = (node: string): void => {
    visiting.add(node);
    visited.add(node);
    stack.push(node);

    for (const next of adjacency.get(node) ?? []) {
      if (!visited.has(next)) {
        visit(next);
        continue;
      }

      if (!visiting.has(next)) {
        continue;
      }

      const start = stack.indexOf(next);
      if (start === -1) {
        continue;
      }

      const cycle = [...stack.slice(start), next];
      const key = normalizeCycle(cycle);
      if (!seen.has(key)) {
        seen.add(key);
        cycles.push(cycle);
      }
    }

    stack.pop();
    visiting.delete(node);
  };

  for (const node of adjacency.keys()) {
    if (!visited.has(node)) {
      visit(node);
    }
  }

  return cycles;
}

function normalizeCycle(cycle: string[]): string {
  const loop = cycle.slice(0, -1);
  const rotations = loop.map((_, index) => [...loop.slice(index), ...loop.slice(0, index)].join('->'));
  rotations.sort();
  return rotations[0] ?? cycle.join('->');
}
