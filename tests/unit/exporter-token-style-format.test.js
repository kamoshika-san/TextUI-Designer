const assert = require('assert');
const { PugExporter } = require('../../out/exporters/pug-exporter');
const { ReactExporter } = require('../../out/exporters/react-exporter');
const { HtmlExporter } = require('../../out/exporters/html-exporter');

describe('Exporter token style formatting', () => {
  it('PugExporter: class shorthand components inject token style modifier only when token exists', async () => {
    const exporter = new PugExporter();
    const dsl = {
      page: {
        components: [
          { Divider: { orientation: 'vertical' } },
          { Divider: { orientation: 'vertical', token: 'var(--token-divider)' } },
          { Tabs: { items: [{ label: 'A', components: [] }] } },
          { Tabs: { items: [{ label: 'B', components: [] }], token: 'var(--token-tabs)' } }
        ]
      }
    };

    const pug = await exporter.export(dsl, { format: 'pug' });

    assert.ok(pug.includes('.inline-block.w-px.h-6.bg-gray-300.mx-4\n'));
    assert.ok(pug.includes('.inline-block.w-px.h-6.bg-gray-300.mx-4(style="border-color: var(--token-divider);")'));
    assert.ok(pug.includes('.textui-tabs.border.border-gray-300.rounded-md.overflow-hidden\n'));
    assert.ok(pug.includes('.textui-tabs.border.border-gray-300.rounded-md.overflow-hidden(style="border-color: var(--token-tabs);")'));
  });

  it('ReactExporter: token style line does not render undefined when token is absent', async () => {
    const exporter = new ReactExporter();
    const dsl = {
      page: {
        components: [
          { Input: { label: 'NoToken', placeholder: 'x' } },
          { Input: { label: 'WithToken', placeholder: 'y', token: 'var(--token-input)' } }
        ]
      }
    };

    const react = await exporter.export(dsl, { format: 'react' });

    assert.ok(!react.includes('undefined'));
    assert.ok(react.includes('style={{ borderColor: "var(--token-input)" }}'));
  });

  it('HtmlExporter: token style attribute is injected only when token exists', async () => {
    const exporter = new HtmlExporter();
    const dsl = {
      page: {
        components: [
          { Divider: { orientation: 'horizontal' } },
          { Divider: { orientation: 'horizontal', token: 'var(--token-divider)' } }
        ]
      }
    };

    const html = await exporter.export(dsl, { format: 'html' });

    assert.ok(html.includes('<hr class="textui-divider my-4">'));
    assert.ok(html.includes('textui-divider my-4') && html.includes('border-color: var(--token-divider)'));
  });
});
