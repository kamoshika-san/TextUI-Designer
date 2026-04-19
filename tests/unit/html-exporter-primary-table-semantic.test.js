/**
 * T-030: Primary HTML export — Table semantic hooks (React static render).
 * Legacy fallback assertions for Table live here only; fallback style lane no longer pins Table.
 */
const assert = require('assert');
const { HtmlExporter } = require('../../out/exporters/html-exporter');

describe('HtmlExporter Primary Table semantic hooks (T-030)', () => {
  const dslTable = {
    page: {
      id: 'primary-table-structure',
      title: 'Primary Table',
      layout: 'vertical',
      components: [
        {
          Table: {
            columns: [{ key: 'name', header: 'Name' }],
            rows: [{ name: 'Alice' }, { name: 'Bob' }],
            rowHover: true,
            striped: true
          }
        }
      ]
    }
  };

  it('Primary lane exposes table container, head/body, header/cell/row, hover and striped hooks', async () => {
    const exporter = new HtmlExporter();
    const html = await exporter.export(dslTable, { format: 'html' });

    assert.ok(html.includes('textui-table-container'));
    assert.ok(html.includes('textui-table'));
    assert.ok(html.includes('textui-table-head'));
    assert.ok(html.includes('textui-table-body'));
    assert.ok(html.includes('textui-table-header'));
    assert.ok(html.includes('textui-table-row'));
    assert.ok(html.includes('textui-table-cell'));
    assert.ok(html.includes('hover:bg-gray-800/80 transition-colors has-hover'));
    assert.ok(html.includes('bg-gray-800/70 is-striped'));
  });
});
