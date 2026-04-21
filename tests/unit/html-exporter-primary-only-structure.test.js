const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { HtmlExporter } = require('../../out/exporters/html-exporter');

/**
 * Primary-only structure guards (Vault T-20260421-020).
 * Complements route-viability: fixes export() staying on React static path without legacy renderXxx.
 */
describe('HtmlExporter Primary-only structure (T-20260421-020)', () => {
  const repoRoot = path.resolve(__dirname, '../..');
  const sourcePath = path.join(repoRoot, 'src', 'exporters', 'html-exporter.ts');
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

  it('source imports the React static primary path and no legacy exporter modules (EXPORTER-FA-002)', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    const codeOnly = source
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');

    assert.match(
      codeOnly,
      /import\s*\{\s*renderPageComponentsToStaticHtml\s*\}\s*from\s*['"]\.\/react-static-export['"]/,
      'HtmlExporter must import renderPageComponentsToStaticHtml as its primary body renderer'
    );
    assert.match(
      codeOnly,
      /renderPageComponentsToStaticHtml\s*\(\s*components\s*\)/,
      'HtmlExporter.export must render page components through the React static primary path'
    );
    assert.doesNotMatch(
      codeOnly,
      /BaseComponentRenderer|from\s*['"][^'"]*legacy|from\s*['"][^'"]*internal/,
      'HtmlExporter must not depend on BaseComponentRenderer, legacy exporters, or fallback/internal lanes'
    );
    assert.doesNotMatch(
      codeOnly,
      /withExplicitFallbackHtmlExport|createHtmlExportLaneOptions|fallback-access|fallback-lane-options/,
      'HtmlExporter must not regain fallback lane helper dependencies'
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
