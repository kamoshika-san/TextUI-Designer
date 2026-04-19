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

  // Full HtmlExporter export on fallback lane: Table + static utility hooks stay here; Tabs-only Primary hooks
  // are covered by `html-exporter-primary-tabs-semantic.test.js` (T-023).
  it('fallback HTML lane keeps Table semantic classes alongside compatibility utilities', async () => {
    const exporter = new HtmlExporter();
    const html = await exporter.export({
      page: {
        id: 'fallback-structure',
        title: 'Fallback Structure',
        layout: 'vertical',
        components: [
          {
            Tabs: {
              defaultTab: 0,
              items: [
                { label: 'Tab 1', components: [{ Text: { value: 'tab body' } }] },
                { label: 'Tab 2', components: [{ Text: { value: 'other body' } }] }
              ]
            }
          },
          {
            Table: {
              columns: [{ key: 'name', header: 'Name' }],
              rows: [{ name: 'Alice' }],
              rowHover: true
            }
          }
        ]
      }
    }, createFallbackOptions({ format: 'html' }));

    assert.ok(html.includes('textui-table-container'));
    assert.ok(html.includes('textui-table-header'));
    assert.ok(html.includes('textui-table-row'));
    assert.ok(html.includes('hover:bg-gray-800/80 transition-colors has-hover'));
  });

  // Same as above — Divider + nested Tabs structures differ from the first scenario; still unreachable on Primary.
  it('fallback HTML lane keeps Tabs and Divider parity hooks for sample-style structures', async () => {
    const exporter = new HtmlExporter();
    const html = await exporter.export({
      page: {
        id: 'fallback-tabs-divider-structure',
        title: 'Fallback Tabs Divider Structure',
        layout: 'vertical',
        components: [
          {
            Tabs: {
              defaultTab: 0,
              items: [
                {
                  label: 'Code',
                  components: [
                    { Divider: { orientation: 'horizontal', spacing: 'md' } },
                    { Text: { value: 'body content' } }
                  ]
                },
                {
                  label: 'Issues',
                  components: [{ Text: { value: 'issue body' } }]
                }
              ]
            }
          },
          { Divider: { orientation: 'vertical', spacing: 'md' } }
        ]
      }
    }, createFallbackOptions({ format: 'html' }));

    assert.ok(html.includes('textui-tabs'));
    assert.ok(html.includes('textui-tabs-list'));
    assert.ok(html.includes('textui-tab-active is-active'));
    assert.ok(html.includes('bg-gray-200 text-gray-900'));
    assert.ok(html.includes('bg-gray-100 text-gray-700'));
    assert.ok(html.includes('textui-tab-panel-body'));
    assert.ok(html.includes('textui-divider horizontal my-4'));
    assert.ok(html.includes('textui-divider vertical my-4'));
  });

  // Form primitives + Alert variant attributes: static fallback renderer emits different class graph than React preview.
  // Input `textui-input` / wrapper hooks are asserted on Primary in `html-exporter-primary-formcontrol-input.test.js` (T-025).
  it('fallback HTML lane keeps FormControl and Alert semantic classes alongside compatibility utilities', async () => {
    const exporter = new HtmlExporter();
    const html = await exporter.export({
      page: {
        id: 'fallback-form-alert-structure',
        title: 'Fallback Form Alert Structure',
        layout: 'vertical',
        components: [
          { Input: { label: 'Email', type: 'email', disabled: true, placeholder: 'name@example.com' } },
          { Checkbox: { label: 'Agree', checked: true, disabled: true } },
          { Radio: { label: 'Priority', name: 'priority', options: [{ label: 'High', value: 'high', checked: true }], disabled: true } },
          { DatePicker: { label: 'Due', name: 'dueDate', disabled: true } },
          { Alert: { title: 'Heads up', message: 'needs attention', variant: 'warning' } }
        ]
      }
    }, createFallbackOptions({ format: 'html' }));

    assert.ok(html.includes('textui-checkbox'));
    assert.ok(html.includes('textui-radio-group'));
    assert.ok(html.includes('textui-radio-option'));
    assert.ok(html.includes('textui-datepicker'));
    assert.ok(html.includes('data-alert-variant="warning"'));
    assert.ok(html.includes('class="textui-alert'));
    assert.ok(html.includes('textui-alert-title'));
    assert.ok(html.includes('textui-alert-message'));
    assert.ok(html.includes('textui-text'));
    assert.ok(html.includes('opacity-50 cursor-not-allowed'));
    assert.ok(html.includes('border-yellow-700'));
  });

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
