/**
 * T-036: Primary HTML export — Accordion + TreeView static semantic class contract.
 */
const assert = require('assert');
const { HtmlExporter } = require('../../out/exporters/html-exporter');

describe('HtmlExporter Primary Accordion + TreeView semantic (T-036)', () => {
  const dsl = {
    page: {
      id: 'primary-accordion-tree-structure',
      title: 'Primary Accordion Tree Structure',
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
  };

  it('Primary lane exposes accordion and treeview semantic hooks', async () => {
    const exporter = new HtmlExporter();
    const html = await exporter.export(dsl, { format: 'html' });

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
