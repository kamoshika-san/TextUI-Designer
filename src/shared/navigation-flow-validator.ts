import * as fs from 'fs';
import * as path from 'path';
import { isNavigationFlowDSL } from '../domain/dsl-types';
import type { ValidationIssue } from '../cli/types';
import { NAV_ERROR_CODES } from './nav-error-codes';
import {
  buildNavigationGraph,
  collectReachableScreenIds,
  findNavigationCycles
} from './navigation-graph';

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

  const graph = buildNavigationGraph(dsl);
  const loopPolicy = dsl.flow.policy?.loops ?? 'deny';

  for (const [transitionId, edges] of graph.duplicateEdgeIds.entries()) {
    for (const edge of edges) {
      issues.push({
        level: 'error',
        code: NAV_ERROR_CODES.DUPLICATE_TRANSITION_ID,
        message: `Duplicate transition id: ${transitionId}`,
        path: `/flow/transitions/${edge.index}/id`
      });
    }
  }

  if (loopPolicy !== 'allow') {
    for (const cycle of findNavigationCycles(graph)) {
      issues.push({
        level: loopPolicy === 'warn' ? 'warning' : 'error',
        code: NAV_ERROR_CODES.CYCLE_DETECTED,
        message: `Circular navigation path detected: ${cycle.join(' -> ')}`,
        path: '/flow/transitions'
      });
    }
  }

  if (screenIds.has(dsl.flow.entry)) {
    const reachable = collectReachableScreenIds(graph, dsl.flow.entry);
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

  if (dsl.flow.policy?.terminalScreensRequired && graph.terminalScreenIds.size === 0) {
    issues.push({
      level: 'error',
      code: NAV_ERROR_CODES.TERMINAL_SCREEN_REQUIRED,
      message: 'At least one terminal screen is required when flow.policy.terminalScreensRequired is enabled',
      path: '/flow/screens'
    });
  }

  return issues;
}
