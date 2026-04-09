import type { NavigationFlowDSL } from '../../domain/dsl-types';
import type { FlowRouteDefinition } from './router-template';

function buildScreenComponents(routes: FlowRouteDefinition[]): string {
  return routes.map(route => `export function ${route.componentName}() {
  return (
    <main className="textui-flow-screen">
      <h1>${route.title}</h1>
      <p>Screen ID: ${route.screenId}</p>
      <p>Route: ${route.path}</p>
    </main>
  );
}`).join('\n\n');
}

export function buildReactFlowAppTemplate(
  dsl: NavigationFlowDSL,
  routes: FlowRouteDefinition[]
): string {
  return `// generated: App.tsx
import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';

export function App() {
  return <RouterProvider router={router} />;
}

export const flowMetadata = {
  id: '${dsl.flow.id}',
  title: '${dsl.flow.title}',
  entry: '${dsl.flow.entry}'
};

${buildScreenComponents(routes)}
`;
}
