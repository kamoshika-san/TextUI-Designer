const assert = require('assert');
const { HtmlExporter } = require('../../out/exporters/html-exporter');
const { PugExporter } = require('../../out/exporters/pug-exporter');
const { withExplicitFallbackHtmlExport } = require('../../out/exporters/html-export-lane-options');

describe('Table cell component rendering', () => {
  const dsl = {
    page: {
      id: 'table-cell-component',
      components: [
        {
          Table: {
            columns: [
              { key: 'name', header: 'Name' },
              { key: 'action', header: 'Action' }
            ],
            rows: [
              {
                name: 'Alice',
                action: { Button: { label: 'Open' } }
              }
            ]
          }
        }
      ]
    }
  };

  it('renders component cell in HTML export', async () => {
    const exporter = new HtmlExporter();
    const html = await exporter.export(dsl, withExplicitFallbackHtmlExport({ format: 'html' }));

    assert.match(html, /<td class="px-4 py-2 align-top text-gray-300">\s*<button[^>]*>(?:.|\n)*Open(?:.|\n)*<\/button>\s*<\/td>/);
  });

  it('renders component cell in Pug export', async () => {
    const exporter = new PugExporter();
    const pug = await exporter.export(dsl, { format: 'pug' });

    assert.match(pug, /td\.px-4\.py-2\.align-top\.text-gray-700\n\s+button\(/);
    assert.match(pug, /\) Open/);
  });
});
