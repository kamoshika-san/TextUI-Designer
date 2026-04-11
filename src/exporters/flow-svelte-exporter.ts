import type { NavigationFlowDSL } from '../domain/dsl-types';
import { isNavigationFlowDSL } from '../domain/dsl-types';
import type { ExportOptions, Exporter } from './export-types';
import { buildFlowRoutes } from './flow-export-route-utils';

function buildRouteBlocks(routes: ReturnType<typeof buildFlowRoutes>): string {
  return routes.map(route => `// route: src/routes${route.path === '/' ? '/+page.svelte' : `${route.path}/+page.svelte`}
<main class="textui-flow-screen" data-screen-id="${route.screenId}" data-screen-kind="${route.screenKind ?? 'screen'}"${route.terminalKind ? ` data-terminal-kind="${route.terminalKind}"` : ''}>
  <h1>${route.title}</h1>
  <p>Screen ID: ${route.screenId}</p>
  <p>Route: ${route.path}</p>
  <p>Screen Kind: ${route.screenKind ?? 'screen'}</p>
  <p>Outgoing Transitions: ${route.outgoingTransitionIds.join(', ') || 'none'}</p>${route.terminalKind ? `
  <p>Terminal Kind: ${route.terminalKind}</p>` : ''}${route.terminalOutcome ? `
  <p>Terminal Outcome: ${route.terminalOutcome}</p>` : ''}
</main>`).join('\n\n');
}

export class FlowSvelteExporter implements Exporter {
  async export(dsl: NavigationFlowDSL, _options: ExportOptions): Promise<string> {
    if (!isNavigationFlowDSL(dsl)) {
      throw new Error('FlowSvelteExporter requires a navigation flow DSL.');
    }

    return buildRouteBlocks(buildFlowRoutes(dsl));
  }

  getFileExtension(): string {
    return '.svelte';
  }
}
