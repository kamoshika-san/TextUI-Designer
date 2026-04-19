/**
 * T-016: HTML exporter **compatibility (fallback) lane** — markup + static CSS contracts.
 *
 * Primary lane renders through React; assertions here about **Tailwind-like compatibility rules**
 * and **static semantic hooks** (`textui-*` classes) are only meaningful when
 * `createFallbackOptions` forces `useReactRender: false`. Primary-only tests cannot
 * substitute without changing product architecture (T-010 keeps production on Primary).
 */
const assert = require('assert');
const { HtmlExporter } = require('../../out/exporters/html-exporter');
const { createFallbackOptions } = require('../helpers/fallback-helper');

const {
  buildHtmlDocument,
  buildFallbackCompatibilityStyleBlock
} = require('../../out/exporters/html-template-builder.js');

function extractDefaultStyleBlock(html) {
  const match = html.match(/<style>([\s\S]*?)<\/style>/);
  assert.ok(match, 'expected default document style block');
  return match[1];
}

describe('HtmlExporter fallback style lane (T-20260327-057)', () => {
  // Primary `buildHtmlDocument` must not bundle legacy compatibility rules into the default <style>;
  // that split is invisible once output is React-only — only the non-React document builder exposes it.
  it('keeps fallback compatibility CSS out of the primary default document style block', () => {
    const styleBlock = extractDefaultStyleBlock(
      buildHtmlDocument('<div class="textui-tabs"></div>', '', { noWrap: true })
    );

    assert.ok(styleBlock.includes('.bg-gray-900'));
    assert.ok(!styleBlock.includes('.textui-badge-primary {'));
    assert.ok(!styleBlock.includes('.textui-progress-fill {'));
    assert.ok(!styleBlock.includes('.textui-tabs .flex > button.textui-tab-active'));
  });

  // Complements the previous test: default document style must still carry light-theme utilities used by both lanes.
  it('omits unused light-theme shared utilities from the default export style block', () => {
    const styleBlock = extractDefaultStyleBlock(
      buildHtmlDocument('<div class="textui-tabs"></div>', '', { noWrap: true })
    );

    assert.ok(styleBlock.includes('.border-gray-300 {'));
    assert.ok(styleBlock.includes('.border-r {'));
    assert.ok(styleBlock.includes('.text-gray-700 {'));
    assert.ok(styleBlock.includes('.text-gray-900 {'));
    assert.ok(styleBlock.includes('.bg-gray-100 {'));
    assert.ok(styleBlock.includes('.bg-gray-200 {'));
  });

  // Ensures opt-in `compatibilityCss` still injects badge/progress/tab rules — exercised without HtmlExporter
  // because we are pinning template-builder layering, not React render output.
  it('keeps compatibility CSS available only when the fallback lane appends it explicitly', () => {
    const html = buildHtmlDocument('<div class="textui-tabs"></div>', '', {
      compatibilityCss: buildFallbackCompatibilityStyleBlock()
    });

    assert.ok(html.includes('.textui-badge-primary {'));
    assert.ok(html.includes('.textui-progress-fill {'));
    assert.ok(html.includes('.textui-tabs .flex > button.textui-tab-active'));
  });

  // Table semantic hooks: Primary-only (`html-exporter-primary-table-semantic.test.js`, T-030).
  // Tabs + Divider composite: Primary-only (`html-exporter-primary-tabs-divider-composite.test.js`, T-033).
  // FormControl (Input + Checkbox + Radio + DatePicker): Primary-only (`html-exporter-primary-formcontrol-*.test.js`, T-025 / T-034).

  // Accordion/TreeView: another static surface area; Primary tests cover behavior, not this CSS/DOM pairing.
  it('fallback HTML lane keeps Accordion/TreeView semantic classes alongside compatibility utilities', async () => {
    const exporter = new HtmlExporter();
    const html = await exporter.export({
      page: {
        id: 'fallback-accordion-tree-structure',
        title: 'Fallback Accordion Tree Structure',
        layout: 'vertical',
        components: [
          {
            Accordion: {
              items: [{ title: 'Section 1', open: true, components: [{ Text: { value: 'body content' } }] }]
            }
          },
          {
            TreeView: {
              showLines: true,
              expandAll: true,
              items: [{ label: 'root', children: [{ label: 'child' }] }]
            }
          }
        ]
      }
    }, createFallbackOptions({ format: 'html' }));

    assert.ok(html.includes('textui-accordion'));
    assert.ok(html.includes('textui-accordion-item'));
    assert.ok(html.includes('textui-accordion-trigger'));
    assert.ok(html.includes('textui-accordion-title'));
    assert.ok(html.includes('textui-accordion-indicator'));
    assert.ok(html.includes('textui-accordion-panel'));
    assert.ok(html.includes('textui-accordion-body'));
    assert.ok(html.includes('is-open'));
    assert.ok(html.includes('textui-treeview-actions'));
    assert.ok(html.includes('textui-treeview-action-link'));
    assert.ok(html.includes('textui-treeview-list with-lines'));
    assert.ok(html.includes('textui-treeview-children'));
  });
});
