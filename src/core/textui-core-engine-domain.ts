import type { TextUIDSL } from '../renderer/types';
import { toPageId, parseDsl, mapHint } from './textui-core-helpers';
import type { GenerateUiRequest, ExplainErrorRequest } from './textui-core-engine';
import { TextUiCoreComponentBuilder } from './textui-core-component-builder';

/**
 * Domain 層:
 * - generate_ui 用の DSL 構築（page/components 組み立て）
 * - DSL 正規化（parseDsl）
 * - explain_error のレスポンス組み立て（mapHint）
 */

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

export function normalizeDslDomain(inputDsl: unknown): TextUIDSL {
  return parseDsl(inputDsl);
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
    return { summary: 'エラーはありません。', suggestions: [] };
  }

  const first = suggestions[0];
  return { summary: `主な原因: ${first.path} ${first.message}`, suggestions };
}

