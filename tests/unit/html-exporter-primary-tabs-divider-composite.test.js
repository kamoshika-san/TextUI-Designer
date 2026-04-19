/**
 * T-033: Primary HTML export — Tabs + Divider composite (nested + sibling dividers).
 */
const assert = require('assert');
const { HtmlExporter } = require('../../out/exporters/html-exporter');

describe('HtmlExporter Primary Tabs + Divider composite (T-033)', () => {
  const dsl = {
    page: {
      id: 'primary-tabs-divider-structure',
      title: 'Primary Tabs Divider Structure',
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
  };

  it('Primary lane exposes tabs list, active tab, panel body, and horizontal/vertical dividers', async () => {
    const exporter = new HtmlExporter();
    const html = await exporter.export(dsl, { format: 'html' });

    assert.ok(html.includes('textui-tabs'));
    assert.ok(html.includes('textui-tabs-list'));
    assert.ok(html.includes('textui-tab is-active'));
    assert.ok(html.includes('textui-tab-panel-body'));
    assert.ok(html.includes('textui-divider horizontal my-4'));
    assert.ok(html.includes('textui-divider vertical my-4'));
  });
});
