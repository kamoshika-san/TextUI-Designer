const assert = require('assert');
const { HtmlExporter } = require('../../out/exporters/html-exporter');
const { ReactExporter } = require('../../out/exporters/react-exporter');
const { PugExporter } = require('../../out/exporters/pug-exporter');

describe('Exporter family structure regression', () => {
  it('同一DSLで HTML / React / Pug の主要構造が維持される', async () => {
    const dsl = {
      page: {
        id: 'ssot-exporter-structure',
        title: 'SSoT Exporters',
        layout: 'vertical',
        components: [
          { Text: { variant: 'h1', value: 'Hello Exporters' } },
          { Form: { id: 'contact-form', fields: [{ Input: { label: 'Name', name: 'name' } }], actions: [{ Button: { label: 'Submit', submit: true } }] } },
          { Table: { columns: [{ key: 'name', header: 'Name' }], rows: [{ name: 'Alice' }] } }
        ]
      }
    };

    const html = await new HtmlExporter().export(dsl, { format: 'html' });
    const react = await new ReactExporter().export(dsl, { format: 'react' });
    const pug = await new PugExporter().export(dsl, { format: 'pug' });

    assert.ok(html.includes('Hello Exporters'));
    assert.ok(html.includes('contact-form'));
    assert.ok(html.includes('<table'));

    assert.ok(react.includes('Hello Exporters'));
    assert.ok(react.includes('contact-form'));
    assert.ok(react.includes('textui-table-container'));

    assert.ok(pug.includes('Hello Exporters'));
    assert.ok(pug.includes('form') && pug.includes('contact-form'));
    assert.ok(pug.includes('table.min-w-full'));
  });
});
