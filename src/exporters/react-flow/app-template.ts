import type { NavigationFlowDSL } from '../../domain/dsl-types';
import type { FlowRouteDefinition } from '../flow-export-route-utils';

function buildScreenComponents(routes: FlowRouteDefinition[]): string {
  return routes.map(route => `export function ${route.componentName}() {
  return (
    <main className="textui-flow-screen" data-screen-id="${route.screenId}" data-screen-kind="${route.screenKind ?? 'screen'}"${route.terminalKind ? ` data-terminal-kind="${route.terminalKind}"` : ''}>
      <h1>${route.title}</h1>
      <p>Screen ID: ${route.screenId}</p>
      <p>Route: ${route.path}</p>
      <p>Screen Kind: ${route.screenKind ?? 'screen'}</p>
      <p>Outgoing Transitions: ${route.outgoingTransitionIds.join(', ') || 'none'}</p>${route.terminalKind ? `
      <p>Terminal Kind: ${route.terminalKind}</p>` : ''}${route.terminalOutcome ? `
      <p>Terminal Outcome: ${route.terminalOutcome}</p>` : ''}
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
  entry: '${dsl.flow.entry}',
  version: '${dsl.flow.version ?? '1'}',
  loopPolicy: '${dsl.flow.policy?.loops ?? 'deny'}',
  terminalScreensRequired: ${dsl.flow.policy?.terminalScreensRequired ?? false},
  transitions: ${JSON.stringify(dsl.flow.transitions.map(transition => ({
    id: transition.id,
    from: transition.from,
    to: transition.to,
    trigger: transition.trigger,
    kind: transition.kind
  })), null, 2)}
};

${buildScreenComponents(routes)}
`;
}
