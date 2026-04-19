/**
 * T-025: Primary HTML export — Input semantic hooks (one FormControl category).
 * Checkbox / Radio / DatePicker / Alert remain asserted on the fallback style lane until migrated.
 */
const assert = require('assert');
const { HtmlExporter } = require('../../out/exporters/html-exporter');

describe('HtmlExporter Primary FormControl Input (T-025)', () => {
  const dslInputOnly = {
    page: {
      id: 'primary-input-structure',
      title: 'Primary Input',
      layout: 'vertical',
      components: [
        {
          Input: {
            label: 'Email',
            type: 'email',
            disabled: true,
            placeholder: 'name@example.com'
          }
        }
      ]
    }
  };

  it('Primary lane exposes Input wrapper and field class hooks', async () => {
    const exporter = new HtmlExporter();
    const html = await exporter.export(dslInputOnly, { format: 'html' });

    assert.ok(html.includes('textui-input-wrapper'));
    assert.ok(html.includes('textui-input'));
  });
});
