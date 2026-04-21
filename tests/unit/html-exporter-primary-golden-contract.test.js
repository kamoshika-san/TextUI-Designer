const assert = require('assert');
const { HtmlExporter } = require('../../out/exporters/html-exporter');

describe('HtmlExporter primary golden contract', () => {
  it('renders representative legacy-sensitive components through the primary path', async () => {
    const dsl = {
      page: {
        id: 'primary-golden',
        title: 'Primary Golden',
        layout: 'vertical',
        components: [
          { Text: { variant: 'h1', value: 'Primary Golden' } },
          {
            Form: {
              id: 'contact-form',
              fields: [{ Input: { label: 'Name', name: 'name', placeholder: 'Ada' } }],
              actions: [{ Button: { label: 'Submit', submit: true } }]
            }
          },
          {
            Table: {
              columns: [{ key: 'name', header: 'Name' }],
              rows: [{ name: 'Ada' }]
            }
          },
          { Alert: { variant: 'info', title: 'Heads up', message: 'Primary route only' } }
        ]
      }
    };

    const html = await new HtmlExporter().export(dsl, { format: 'html' });

    assert.ok(html.includes('Primary Golden'));
    assert.ok(html.includes('contact-form'));
    assert.ok(html.includes('placeholder="Ada"'));
    assert.ok(html.includes('<table'));
    assert.ok(html.includes('Heads up'));
    assert.ok(html.includes('Primary route only'));
  });
});
