import type { NavigationFlowDSL } from '../domain/dsl-types';
import { isNavigationFlowDSL } from '../domain/dsl-types';
import type { ExportOptions, Exporter } from './export-types';
import { buildFlowRoutes } from './flow-export-route-utils';

function buildImports(routes: ReturnType<typeof buildFlowRoutes>): string {
  return routes.map(route => `const ${route.componentName} = { template: \`<main class="textui-flow-screen"><h1>${route.title}</h1><p>Screen ID: ${route.screenId}</p><p>Route: ${route.path}</p></main>\` };`).join('\n');
}

function buildRouteRecords(routes: ReturnType<typeof buildFlowRoutes>): string {
  return routes.map(route => `  { path: '${route.path}', component: ${route.componentName} }`).join(',\n');
}

export class FlowVueExporter implements Exporter {
  async export(dsl: NavigationFlowDSL, _options: ExportOptions): Promise<string> {
    if (!isNavigationFlowDSL(dsl)) {
      throw new Error('FlowVueExporter requires a navigation flow DSL.');
    }

    const routes = buildFlowRoutes(dsl);
    return `// generated: router.ts
import { createRouter, createWebHistory } from 'vue-router';

${buildImports(routes)}

export const router = createRouter({
  history: createWebHistory(),
  routes: [
${buildRouteRecords(routes)}
  ]
});
`;
  }

  getFileExtension(): string {
    return '.ts';
  }
}
