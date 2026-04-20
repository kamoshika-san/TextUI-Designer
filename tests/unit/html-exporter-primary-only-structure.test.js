const assert = require('assert');
const { HtmlExporter } = require('../../out/exporters/html-exporter');
const { BaseComponentRenderer } = require('../../out/exporters/legacy/base-component-renderer');

/**
 * Primary-only structure guards (Vault T-20260421-020).
 * Complements route-viability: fixes export() staying on React static path without legacy renderXxx.
 */
describe('HtmlExporter Primary-only structure (T-20260421-020)', () => {
  const dsl = {
    page: {
      components: [{ Text: { value: 'primary structure guard' } }]
    }
  };

  it('rejects useReactRender false with FALLBACK_REMOVED', async () => {
    const exporter = new HtmlExporter();
    await assert.rejects(
      async () => exporter.export(dsl, { format: 'html', useReactRender: false }),
      err => err instanceof Error && /FALLBACK_REMOVED|HtmlExporter:FALLBACK_REMOVED/.test(err.message),
      'expected compatibility lane removal error'
    );
  });

  it('HtmlExporter is not a BaseComponentRenderer subclass (E-HTML T-022)', () => {
    assert.strictEqual(
      new HtmlExporter() instanceof BaseComponentRenderer,
      false,
      'HtmlExporter must implement Exporter without legacy renderer inheritance'
    );
  });

  it('primary export uses static React path and embeds DSL text', async () => {
    const html = await new HtmlExporter().export(dsl, { format: 'html', useReactRender: true });
    assert.ok(typeof html === 'string' && html.length > 0);
    assert.ok(html.includes('primary structure guard'), 'expected DSL text in static React output');
  });

  it('omits useReactRender and still uses primary path', async () => {
    const html = await new HtmlExporter().export(dsl, { format: 'html' });
    assert.ok(html.includes('primary structure guard'));
  });

  it('rejects navigation flow DSL (use html-flow)', async () => {
    const flowDsl = {
      flow: {
        id: 'f1',
        title: 'Flow',
        entry: 's1',
        screens: [{ id: 's1', page: 'screen.tui.yml' }],
        transitions: []
      }
    };
    await assert.rejects(
      async () => new HtmlExporter().export(flowDsl, { format: 'html' }),
      err => err instanceof Error && /html-flow/.test(err.message)
    );
  });
});
