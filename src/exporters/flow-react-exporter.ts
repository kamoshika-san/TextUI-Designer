import * as path from 'path';
import type { NavigationFlowDSL } from '../domain/dsl-types';
import { isNavigationFlowDSL } from '../domain/dsl-types';
import type { ExportOptions } from './export-types';
import { buildReactFlowAppTemplate } from './react-flow/app-template';
import { buildReactFlowRouterTemplate, type FlowRouteDefinition } from './react-flow/router-template';

function toPascalCase(value: string): string {
  return value
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join('');
}

function normalizeRouteSegment(segment: string): string {
  return segment
    .replace(/\[(.+?)\]/g, ':$1');
}

function deriveRoutePath(screenId: string, pagePath: string, isEntry: boolean): string {
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

function buildRoutes(dsl: NavigationFlowDSL): FlowRouteDefinition[] {
  return dsl.flow.screens.map(screen => ({
    path: deriveRoutePath(screen.id, screen.page, screen.id === dsl.flow.entry),
    componentName: `${toPascalCase(screen.id)}Page`,
    title: screen.title || screen.id,
    screenId: screen.id
  }));
}

export class FlowReactExporter {
  async export(dsl: NavigationFlowDSL, _options: ExportOptions): Promise<string> {
    if (!isNavigationFlowDSL(dsl)) {
      throw new Error('FlowReactExporter requires a navigation flow DSL.');
    }

    const routes = buildRoutes(dsl);
    const routerTemplate = buildReactFlowRouterTemplate(dsl, routes);
    const appTemplate = buildReactFlowAppTemplate(dsl, routes);

    return `${routerTemplate}\n${appTemplate}`.trim();
  }

  getFileExtension(): string {
    return '.tsx';
  }
}
