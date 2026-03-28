const assert = require('assert');
const { HtmlExporter } = require('../../out/exporters/html-exporter');
const { withExplicitFallbackHtmlExport } = require('../../out/exporters/html-export-lane-options');

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
  it('keeps fallback compatibility CSS out of the primary default document style block', () => {
    const styleBlock = extractDefaultStyleBlock(
      buildHtmlDocument('<div class="textui-tabs"></div>', '', { noWrap: true })
    );

    assert.ok(styleBlock.includes('.bg-gray-900'));
    assert.ok(!styleBlock.includes('.textui-badge-primary {'));
    assert.ok(!styleBlock.includes('.textui-progress-fill {'));
    assert.ok(!styleBlock.includes('.textui-tabs .flex > button.textui-tab-active'));
  });

  it('omits unused light-theme shared utilities from the default export style block', () => {
    const styleBlock = extractDefaultStyleBlock(
      buildHtmlDocument('<div class="textui-tabs"></div>', '', { noWrap: true })
    );

    assert.ok(!styleBlock.includes('.border-gray-300 {'));
    assert.ok(!styleBlock.includes('.text-gray-700 {'));
    assert.ok(!styleBlock.includes('.text-gray-900 {'));
    assert.ok(!styleBlock.includes('.bg-gray-100 {'));
    assert.ok(!styleBlock.includes('.bg-gray-200 {'));
  });

  it('keeps compatibility CSS available only when the fallback lane appends it explicitly', () => {
    const html = buildHtmlDocument('<div class="textui-tabs"></div>', '', {
      compatibilityCss: buildFallbackCompatibilityStyleBlock()
    });

    assert.ok(html.includes('.textui-badge-primary {'));
    assert.ok(html.includes('.textui-progress-fill {'));
    assert.ok(html.includes('.textui-tabs .flex > button.textui-tab-active'));
  });

  it('fallback HTML lane keeps Tabs/Table semantic classes alongside compatibility utilities', async () => {
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
              items: [{ label: 'Tab 1', components: [{ Text: { value: 'tab body' } }] }]
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
    }, withExplicitFallbackHtmlExport({ format: 'html' }));

    assert.ok(html.includes('textui-tabs-list'));
    assert.ok(html.includes('textui-tab-panel-body'));
    assert.ok(html.includes('textui-tab-active is-active'));
    assert.ok(html.includes('textui-table-container'));
    assert.ok(html.includes('textui-table-header'));
    assert.ok(html.includes('textui-table-row'));
    assert.ok(html.includes('hover:bg-gray-800/80 transition-colors has-hover'));
  });

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
    }, withExplicitFallbackHtmlExport({ format: 'html' }));

    assert.ok(html.includes('textui-input'));
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
    }, withExplicitFallbackHtmlExport({ format: 'html' }));

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
