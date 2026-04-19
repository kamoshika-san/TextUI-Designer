/**
 * T-034: Primary HTML export — Checkbox / Radio / DatePicker semantic hooks (remaining FormControl).
 */
const assert = require('assert');
const { HtmlExporter } = require('../../out/exporters/html-exporter');

describe('HtmlExporter Primary FormControl remaining (T-034)', () => {
  const dsl = {
    page: {
      id: 'primary-formcontrol-remaining',
      title: 'Primary FormControl Remaining',
      layout: 'vertical',
      components: [
        { Checkbox: { label: 'Agree', checked: true, disabled: true } },
        { Radio: { label: 'Priority', name: 'priority', options: [{ label: 'High', value: 'high', checked: true }], disabled: true } },
        { DatePicker: { label: 'Due', name: 'dueDate', disabled: true } }
      ]
    }
  };

  it('Primary lane exposes checkbox, radio group/option, datepicker, labels, and disabled affordance', async () => {
    const exporter = new HtmlExporter();
    const html = await exporter.export(dsl, { format: 'html' });

    assert.ok(html.includes('textui-checkbox'));
    assert.ok(html.includes('textui-checkbox-wrapper'));
    assert.ok(html.includes('textui-radio-group'));
    assert.ok(html.includes('textui-radio-option'));
    assert.ok(html.includes('textui-datepicker'));
    assert.ok(html.includes('textui-input'));
    assert.ok(html.includes('textui-text'));
    assert.ok(html.includes('opacity-50 cursor-not-allowed'));
  });
});
