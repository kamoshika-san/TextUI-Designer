import type { NavigationFlowDSL } from '../../domain/dsl-types';
import type { FlowRouteDefinition } from '../flow-export-route-utils';

function buildRouteLines(routes: FlowRouteDefinition[]): string {
  return routes.map(route =>
    `  { path: '${route.path}', element: <${route.componentName} />, handle: { screenId: '${route.screenId}', kind: '${route.screenKind ?? 'screen'}', terminalKind: ${route.terminalKind ? `'${route.terminalKind}'` : 'undefined'} } }`
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
