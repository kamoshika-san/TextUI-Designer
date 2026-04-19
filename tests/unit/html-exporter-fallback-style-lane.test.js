/**
 * T-016: HTML exporter **compatibility (fallback) lane** — markup + static CSS contracts.
 *
 * Primary lane renders through React. Assertions here target **document-level style blocks**
 * (`buildHtmlDocument`) including optional `compatibilityCss` concatenation (T-20260420-001: HtmlExporter fallback lane removed).
 */
const assert = require('assert');
const { buildHtmlDocument } = require('../../out/exporters/html-template-builder.js');

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
    assert.ok(!styleBlock.includes('.textui-button.primary {'));
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

  // Ensures opt-in `compatibilityCss` still concatenates into the document (lane removed; slot remains in builder).
  it('concatenates optional compatibilityCss into the document style block', () => {
    const compat = '/* T-042–T-044: compat block removed; WebView CSS is SSoT */\n';
    const html = buildHtmlDocument('<div class="textui-tabs"></div>', '', {
      compatibilityCss: compat
    });

    assert.ok(html.includes('T-042'));
    assert.ok(!html.includes('.textui-badge-primary {'));
    assert.ok(!html.includes('.textui-progress-fill {'));
  });

  // Table semantic hooks: Primary-only (`html-exporter-primary-table-semantic.test.js`, T-030).
  // Tabs + Divider composite: Primary-only (`html-exporter-primary-tabs-divider-composite.test.js`, T-033).
  // FormControl (Input + Checkbox + Radio + DatePicker): Primary-only (`html-exporter-primary-formcontrol-*.test.js`, T-025 / T-034).

  // Accordion / TreeView: Primary-only (`html-exporter-primary-accordion-treeview-semantic.test.js`, T-036).
});
