/**
 * T-031: Primary HTML export — Alert variant hooks (`data-alert-variant`, semantic classes).
 */
const assert = require('assert');
const { HtmlExporter } = require('../../out/exporters/html-exporter');

describe('HtmlExporter Primary Alert variant hooks (T-031)', () => {
  async function exportAlert(variant) {
    const dsl = {
      page: {
        id: `primary-alert-${variant}`,
        title: 'Primary Alert',
        layout: 'vertical',
        components: [
          {
            Alert: {
              title: 'Title',
              message: `Message ${variant}`,
              variant
            }
          }
        ]
      }
    };
    const exporter = new HtmlExporter();
    return exporter.export(dsl, { format: 'html' });
  }

  for (const variant of ['info', 'success', 'warning', 'error']) {
    it(`Primary lane exposes data-alert-variant and textui-alert classes for ${variant}`, async () => {
      const html = await exportAlert(variant);
      assert.ok(html.includes(`data-alert-variant="${variant}"`), `missing data-alert-variant for ${variant}`);
      assert.ok(html.includes('textui-alert-title'));
      assert.ok(html.includes('textui-alert-message'));
      assert.ok(html.includes(`textui-alert ${variant}`), `missing textui-alert ${variant} class bundle`);
    });
  }
});
