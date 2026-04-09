import type { NavigationFlowDSL } from '../domain/dsl-types';
import { isNavigationFlowDSL } from '../domain/dsl-types';
import type { ExportOptions } from './export-types';
import { buildReactFlowAppTemplate } from './react-flow/app-template';
import { buildFlowRoutes } from './flow-export-route-utils';
import { buildReactFlowRouterTemplate } from './react-flow/router-template';

export class FlowReactExporter {
  async export(dsl: NavigationFlowDSL, _options: ExportOptions): Promise<string> {
    if (!isNavigationFlowDSL(dsl)) {
      throw new Error('FlowReactExporter requires a navigation flow DSL.');
    }

    const routes = buildFlowRoutes(dsl);
    const routerTemplate = buildReactFlowRouterTemplate(dsl, routes);
    const appTemplate = buildReactFlowAppTemplate(dsl, routes);

    return `${routerTemplate}\n${appTemplate}`.trim();
  }

  getFileExtension(): string {
    return '.tsx';
  }
}
