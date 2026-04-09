import type { NavigationFlowDSL } from '../domain/dsl-types';
import { isNavigationFlowDSL } from '../domain/dsl-types';
import type { ExportOptions, Exporter } from './export-types';
import { buildFlowRoutes } from './flow-export-route-utils';

function buildPageSections(routes: ReturnType<typeof buildFlowRoutes>): string {
  return routes.map(route => `<!-- page: ${route.path === '/' ? '/index.html' : `${route.path}/index.html`} -->
<section data-route="${route.path}">
  <h1>${route.title}</h1>
  <p>Screen ID: ${route.screenId}</p>
  <p>Route: ${route.path}</p>
</section>`).join('\n\n');
}

function buildSitemap(routes: ReturnType<typeof buildFlowRoutes>): string {
  const entries = routes.map(route => `  <url><loc>${route.path}</loc></url>`).join('\n');
  return `<!-- file: sitemap.xml -->
<urlset>
${entries}
</urlset>`;
}

export class FlowHtmlExporter implements Exporter {
  async export(dsl: NavigationFlowDSL, _options: ExportOptions): Promise<string> {
    if (!isNavigationFlowDSL(dsl)) {
      throw new Error('FlowHtmlExporter requires a navigation flow DSL.');
    }

    const routes = buildFlowRoutes(dsl);
    return `${buildPageSections(routes)}\n\n${buildSitemap(routes)}`;
  }

  getFileExtension(): string {
    return '.html';
  }
}
