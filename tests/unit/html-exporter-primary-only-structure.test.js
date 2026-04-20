const assert = require('assert');
const { HtmlExporter } = require('../../out/exporters/html-exporter');

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

  it('primary export does not invoke legacy renderText override', async () => {
    const exporter = new HtmlExporter();
    let renderTextCalls = 0;
    const orig = HtmlExporter.prototype.renderText;
    HtmlExporter.prototype.renderText = function patchedRenderText() {
      renderTextCalls += 1;
      return orig.apply(this, arguments);
    };
    try {
      const html = await exporter.export(dsl, { format: 'html', useReactRender: true });
      assert.ok(typeof html === 'string' && html.length > 0);
      assert.strictEqual(
        renderTextCalls,
        0,
        'renderText must not run on Primary static-html path'
      );
      assert.ok(
        html.includes('primary structure guard'),
        'expected DSL text in static React output'
      );
    } finally {
      HtmlExporter.prototype.renderText = orig;
    }
  });

  it('omits useReactRender and still uses primary path', async () => {
    const html = await new HtmlExporter().export(dsl, { format: 'html' });
    assert.ok(html.includes('primary structure guard'));
  });
});
