const assert = require('assert');
const crypto = require('crypto');
const path = require('path');
const { loadDslWithIncludesFromPath } = require('../../out/dsl/load-dsl-with-includes');
const { HtmlExporter } = require('../../out/exporters/html-exporter');

function normalizeHtml(html) {
  return html.replace(/\r\n/g, '\n');
}

function hashHtml(html) {
  return crypto.createHash('sha256').update(normalizeHtml(html)).digest('hex');
}

async function exportPrimarySample(sampleRelativePath) {
  const repoRoot = path.resolve(__dirname, '../..');
  const samplePath = path.join(repoRoot, sampleRelativePath);
  const { dsl } = loadDslWithIncludesFromPath(samplePath);
  const html = await new HtmlExporter().export(dsl, { format: 'html' });
  return { html, hash: hashHtml(html) };
}

describe('HtmlExporter primary sample regression (T-20260322-348)', () => {
  [
    {
      sampleRelativePath: 'sample/01-basic/sample.tui.yml',
      expectedHash: 'f704dec63652d45b218bc0986b94fd268dd5ba899486c19e740763a4f2d5febf',
      markers: ['TextUI Designer - All Components', 'This sample includes every supported component.', 'Agree to terms']
    },
    {
      sampleRelativePath: 'sample/08-github/sample.tui.yml',
      expectedHash: 'f196b3d4fe8a947afb249918edd620d116e6d904e93cc354e8c32c66b8e1dcfa',
      markers: ['kamoshika-san / TextUI-Designer', 'VS Code extension for designing text-based UIs with YAML/JSON DSL.', 'Pull requests']
    }
  ].forEach(({ sampleRelativePath, expectedHash, markers }) => {
    it(`${sampleRelativePath} stays stable on the Primary HTML path`, async () => {
      const { html, hash } = await exportPrimarySample(sampleRelativePath);

      markers.forEach(marker => {
        assert.ok(
          html.includes(marker),
          `Expected Primary HTML export for ${sampleRelativePath} to include marker: ${marker}`
        );
      });
      assert.strictEqual(
        hash,
        expectedHash,
        `Primary HTML export hash changed for ${sampleRelativePath}`
      );
    });
  });
});
