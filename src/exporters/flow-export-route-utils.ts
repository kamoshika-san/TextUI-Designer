import * as path from 'path';
import type { NavigationFlowDSL, NavigationScreenKind, NavigationTerminalKind } from '../domain/dsl-types';
import { createNavigationTransitionId } from '../shared/navigation-graph';

export interface FlowRouteDefinition {
  path: string;
  componentName: string;
  title: string;
  screenId: string;
  screenKind?: NavigationScreenKind;
  tags?: string[];
  terminalKind?: NavigationTerminalKind;
  terminalOutcome?: string;
  outgoingTransitionIds: string[];
}

function toPascalCase(value: string): string {
  return value
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join('');
}

function normalizeRouteSegment(segment: string): string {
  return segment.replace(/\[(.+?)\]/g, ':$1');
}

export function deriveFlowRoutePath(screenId: string, pagePath: string, isEntry: boolean): string {
  if (screenId.startsWith('/')) {
    return screenId;
  }

  const parsed = path.parse(pagePath);
  const directory = parsed.dir.split(/[\\/]/).filter(Boolean).map(normalizeRouteSegment);
  const baseName = normalizeRouteSegment(parsed.name.replace(/\.tui$/, ''));
  const segments = [...directory, baseName].filter(Boolean).filter(segment => segment !== '.');

  if (isEntry || baseName === 'index' || baseName === 'home') {
    return '/';
  }

  return `/${segments.join('/')}`;
}

export function buildFlowRoutes(dsl: NavigationFlowDSL): FlowRouteDefinition[] {
  return dsl.flow.screens.map(screen => ({
    path: deriveFlowRoutePath(screen.id, screen.page, screen.id === dsl.flow.entry),
    componentName: `${toPascalCase(screen.id)}Page`,
    title: screen.title || screen.id,
    screenId: screen.id,
    screenKind: screen.kind,
    tags: screen.tags,
    terminalKind: screen.terminal?.kind,
    terminalOutcome: screen.terminal?.outcome,
    outgoingTransitionIds: dsl.flow.transitions
      .filter(transition => transition.from === screen.id)
      .map(transition => transition.id ?? createNavigationTransitionId(transition))
  }));
}
