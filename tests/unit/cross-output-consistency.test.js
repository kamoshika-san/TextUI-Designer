/**
 * Cross-output consistency: Phase2-S3
 *
 * Asserts that representative sample DSLs produce consistent content across
 * multiple export formats (HTML and React). Failure means the same DSL
 * renders differently depending on the output target — a release-blocking
 * regression.
 *
 * Non-goals: visual regression, screenshot/capture, full sample coverage.
 */

const assert = require('assert');
const path = require('path');
const { loadDslWithIncludesFromPath } = require('../../out/dsl/load-dsl-with-includes');
const { HtmlExporter } = require('../../out/exporters/html-exporter');
const { ReactExporter } = require('../../out/exporters/react-exporter');

const REPO_ROOT = path.resolve(__dirname, '../..');
// Sentinel path prevents any local media/assets CSS from leaking into export output,
// ensuring CI and developer machines produce identical results.
const NO_ASSETS_SENTINEL = path.join(REPO_ROOT, '_test_no_assets_sentinel');

async function exportSample(sampleRelativePath) {
  const samplePath = path.join(REPO_ROOT, sampleRelativePath);
  const { dsl } = loadDslWithIncludesFromPath(samplePath);
  const opts = { extensionPath: NO_ASSETS_SENTINEL };
  const html = await new HtmlExporter().export(dsl, { ...opts, format: 'html' });
  const react = await new ReactExporter().export(dsl, { ...opts, format: 'react' });
  return { dsl, html, react };
}

describe('Cross-output consistency: HTML vs React (Phase2-S3)', () => {
  const samples = [
    {
      sampleRelativePath: 'sample/01-basic/sample.tui.yml',
      // Text markers that must appear in ALL export formats for this sample.
      // Chosen to be format-agnostic plain text (not HTML tags or JSX syntax).
      sharedMarkers: ['TextUI Designer - All Components', 'Agree to terms']
    },
    {
      sampleRelativePath: 'sample/08-github/sample.tui.yml',
      sharedMarkers: ['kamoshika-san / TextUI-Designer', 'Pull requests']
    }
  ];

  samples.forEach(({ sampleRelativePath, sharedMarkers }) => {
    describe(sampleRelativePath, () => {
      let outputs;

      before(async () => {
        outputs = await exportSample(sampleRelativePath);
      });

      it('DSL loads with components', () => {
        const { dsl } = outputs;
        assert.ok(
          dsl && dsl.page && Array.isArray(dsl.page.components) && dsl.page.components.length > 0,
          `Expected DSL to have components: ${sampleRelativePath}`
        );
      });

      sharedMarkers.forEach(marker => {
        it(`HTML output contains marker: "${marker}"`, () => {
          assert.ok(
            outputs.html.includes(marker),
            `HTML export missing marker "${marker}" in ${sampleRelativePath}\nHTML length: ${outputs.html.length}`
          );
        });

        it(`React output contains marker: "${marker}"`, () => {
          assert.ok(
            outputs.react.includes(marker),
            `React export missing marker "${marker}" in ${sampleRelativePath}\nReact length: ${outputs.react.length}`
          );
        });
      });
    });
  });
});
