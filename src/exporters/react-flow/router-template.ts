import type { NavigationFlowDSL } from '../../domain/dsl-types';

export interface FlowRouteDefinition {
  path: string;
  componentName: string;
  title: string;
  screenId: string;
}

function buildRouteLines(routes: FlowRouteDefinition[]): string {
  return routes.map(route =>
    `  { path: '${route.path}', element: <${route.componentName} /> }`
  ).join(',\n');
}

function buildImports(routes: FlowRouteDefinition[]): string {
  return routes.map(route => `import { ${route.componentName} } from './App';`).join('\n');
}

export function buildReactFlowRouterTemplate(
  _dsl: NavigationFlowDSL,
  routes: FlowRouteDefinition[]
): string {
  return `// generated: router.tsx
import React from 'react';
import { createBrowserRouter } from 'react-router-dom';
${buildImports(routes)}

export const router = createBrowserRouter([
${buildRouteLines(routes)}
]);
`;
}
