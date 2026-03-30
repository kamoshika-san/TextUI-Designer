/**
 * Static HTML export path: build the same React tree as the WebView and
 * serialize it with renderToStaticMarkup.
 */
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ComponentDef } from '../domain/dsl-types';
import { createComponentKeys } from '../renderer/preview-diff';
import { registerBuiltInComponents, renderRegisteredComponent } from '../renderer/component-map';
import { getStaticHtmlRenderContext } from './static-html-render-adapter';

/**
 * Build static HTML from page components using the primary React-based path.
 */
export function renderPageComponentsToStaticHtml(components: ComponentDef[]): string {
  // Tests and extension slices may clear the shared preview registry.
  // Re-register built-ins here so primary export does not depend on module load order.
  registerBuiltInComponents();

  const componentKeys = createComponentKeys(components);
  const staticCtx = getStaticHtmlRenderContext();
  const children = components.map((comp, i) =>
    renderRegisteredComponent(comp, componentKeys[i] ?? i, staticCtx)
  );

  return renderToStaticMarkup(
    React.createElement('div', { style: { boxSizing: 'border-box', width: '100%', maxWidth: '100%', padding: 24 } }, ...children)
  );
}
