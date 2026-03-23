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
          { Divider: { orientation: 'horizontal', token: 'var(--token-divider)' } },
          { Container: { layout: 'vertical', token: 'var(--token-container-bg)', components: [] } }
        ]
      }
    };

    const html = await exporter.export(dsl, { format: 'html', useReactRender: false });

    assert.ok(html.includes('textui-divider my-4'), 'output contains divider with textui-divider and my-4');
    assert.ok(html.includes('textui-divider my-4') && html.includes('border-color: var(--token-divider)'));
    assert.ok(
      html.includes('background-color: var(--tui-slot-container-background, var(--token-container-bg))'),
      'Container token wrapped with container.background slot (same vocabulary as preview)'
    );
    assert.ok(
      html.includes('border-color: var(--tui-slot-container-border, var(--token-container-bg))'),
      'Container token also applies container.border slot'
    );
  });

  it('HtmlExporter: Text token uses slot-aware var() when defaultTokenSlot is set (T-20260322-202)', async () => {
    const exporter = new HtmlExporter();
    const dsl = {
      page: {
        components: [{ Text: { value: 'hello', token: '#aabbcc' } }]
      }
    };

    const html = await exporter.export(dsl, { format: 'html', useReactRender: false });

    assert.ok(
      html.includes('color: var(--tui-slot-text-color, #aabbcc)'),
      'HTML path wraps token with slot CSS variable and fallback'
    );
  });

  it('HtmlExporter: React render path also applies Container token across declared slots', async () => {
    const exporter = new HtmlExporter();
    const dsl = {
      page: {
        components: [
          { Container: { layout: 'vertical', token: 'rgb(245, 245, 245)', components: [{ Text: { value: 'inside' } }] } }
        ]
      }
    };

    const html = await exporter.export(dsl, { format: 'html' });

    assert.ok(
      html.includes('var(--tui-slot-container-background, rgb(245, 245, 245))') ||
        html.includes('background-color:rgb(245, 245, 245)') ||
        html.includes('background-color: rgb(245, 245, 245)'),
      'React path uses slot-aware var or legacy literal'
    );
    assert.ok(
      html.includes('var(--tui-slot-container-border, rgb(245, 245, 245))') ||
        html.includes('border-color:rgb(245, 245, 245)') ||
        html.includes('border-color: rgb(245, 245, 245)'),
      'React path includes border slot styling too'
    );
    assert.ok(html.includes('inside'));
  });

});
