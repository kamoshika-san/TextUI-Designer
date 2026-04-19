/**
 * T-023: Primary HTML export — Tabs semantic hooks (React static render).
 * Fallback lane asserts legacy concatenated classes (e.g. `textui-tab-active is-active`);
 * Primary uses `textui-tab is-active` on the same contract surface.
 */
const assert = require('assert');
const { HtmlExporter } = require('../../out/exporters/html-exporter');

describe('HtmlExporter Primary Tabs semantic hooks (T-023)', () => {
  const dslTabsOnly = {
    page: {
      id: 'primary-tabs-structure',
      title: 'Primary Tabs',
      layout: 'vertical',
      components: [
        {
          Tabs: {
            defaultTab: 0,
            items: [
              { label: 'Tab 1', components: [{ Text: { value: 'tab body' } }] },
              { label: 'Tab 2', components: [{ Text: { value: 'other body' } }] }
            ]
          }
        }
      ]
    }
  };

  it('Primary lane exposes Tabs list, tab, active state, and panel body hooks', async () => {
    const exporter = new HtmlExporter();
    const html = await exporter.export(dslTabsOnly, { format: 'html' });

    assert.ok(html.includes('textui-tabs'));
    assert.ok(html.includes('textui-tabs-list'));
    assert.ok(html.includes('textui-tab-panel'));
    assert.ok(html.includes('textui-tab-panel-body'));
    assert.ok(html.includes('textui-tab is-active'));
  });
});
