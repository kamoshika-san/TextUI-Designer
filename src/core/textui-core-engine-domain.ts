import type { NavigationFlowDSL, TextUIDSL } from '../domain/dsl-types';
import { toPageId, parseDsl, mapHint } from './textui-core-helpers';
import type { GenerateUiRequest, ExplainErrorRequest } from './textui-core-engine';
import { TextUiCoreComponentBuilder } from './textui-core-component-builder';

export function buildGenerateUiDsl(
  request: GenerateUiRequest,
  componentBuilder: TextUiCoreComponentBuilder
): TextUIDSL {
  return {
    page: {
      id: request.pageId ?? toPageId(request.title),
      title: request.title,
      layout: request.layout ?? 'vertical',
      components: componentBuilder.buildComponents(request.components ?? [])
    }
  };
}

export function normalizeDslDomain(inputDsl: unknown, kind: 'ui' | 'navigation' = 'ui'): TextUIDSL | NavigationFlowDSL {
  return parseDsl(inputDsl, kind);
}

export function buildExplainErrorResponseDomain(request: ExplainErrorRequest): {
  summary: string;
  suggestions: Array<{ path: string; message: string; hint: string }>;
} {
  const suggestions = request.diagnostics.map(issue => ({
    path: issue.path ?? '/',
    message: issue.message,
    hint: mapHint(issue.message)
  }));

  if (suggestions.length === 0) {
    return { summary: 'No errors.', suggestions: [] };
  }

  const first = suggestions[0];
  return { summary: `Primary issue: ${first.path} ${first.message}`, suggestions };
}
