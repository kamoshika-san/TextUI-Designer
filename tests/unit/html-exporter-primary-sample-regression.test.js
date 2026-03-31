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

function compactSnippet(html, marker, radius = 120) {
  const normalized = normalizeHtml(html);
  const idx = normalized.indexOf(marker);
  if (idx === -1) {
    return null;
  }
  const start = Math.max(0, idx - radius);
  const end = Math.min(normalized.length, idx + marker.length + radius);
  return normalized.slice(start, end).replace(/\s+/g, ' ').trim();
}

function buildPrimaryRegressionDebug(sampleRelativePath, html, hash, expectedHash, marker, dsl) {
  const normalized = normalizeHtml(html);
  return [
    `sample: ${sampleRelativePath}`,
    `missing marker: ${marker}`,
    `expected hash: ${expectedHash}`,
    `actual hash: ${hash}`,
    `html length: ${normalized.length}`,
    `page title: ${dsl?.page?.title ?? '<missing>'}`,
    `component count: ${Array.isArray(dsl?.page?.components) ? dsl.page.components.length : '<non-array>'}`,
    `html preview: ${JSON.stringify(normalized.slice(0, 240))}`
  ].join('\n');
}

async function exportPrimarySample(sampleRelativePath) {
  const repoRoot = path.resolve(__dirname, '../..');
  const samplePath = path.join(repoRoot, sampleRelativePath);
  const { dsl } = loadDslWithIncludesFromPath(samplePath);
  // Pass a sentinel extensionPath that is guaranteed to not resolve to any real CSS file.
  // This ensures the export always uses getDefaultExportStyleBlock() regardless of
  // local build artifacts (media/assets/index-*.css) present on developer machines.
  // CI and local machines produce identical output.
  const html = await new HtmlExporter().export(dsl, { format: 'html', extensionPath: path.join(repoRoot, '_test_no_assets_sentinel') });
  return { dsl, html, hash: hashHtml(html) };
}

describe('HtmlExporter primary sample regression (T-20260322-348)', () => {
  [
    {
      sampleRelativePath: 'sample/01-basic/sample.tui.yml',
      expectedHash: '05e67836393789af1d11e1c8674ec9e8923eaf3cb97ac9e3cd9c639770d5a0fb', // primary hash from stable CI expected output; revert to currently observed export result
      markers: ['TextUI Designer - All Components', 'This sample includes every supported component.', 'Agree to terms']
    },
    {
      sampleRelativePath: 'sample/08-github/sample.tui.yml',
      expectedHash: 'a200c92d609e2fb6cae0a0b644313f50840ddedc62cf0f74f4f9b6621381fa99', // primary hash from stable CI expected output; revert to currently observed export result
      markers: ['kamoshika-san / TextUI-Designer', 'VS Code extension for designing text-based UIs with YAML/JSON DSL.', 'Pull requests']
    },
    {
      sampleRelativePath: 'sample/09-modal/sample.tui.yml',
      expectedHash: 'c8cc1d49156e0b9e9acfc9eeffc3d1261fdf85cf228100ae4dffac6125bc6e4a', // primary hash from stable CI expected output; revert to currently observed export result
      markers: ['削除の確認', 'この操作は元に戻せません', '削除する', 'ユーザー詳細']
    }
  ].forEach(({ sampleRelativePath, expectedHash, markers }) => {
    it(`${sampleRelativePath} stays stable on the Primary HTML path`, async () => {
      const { dsl, html, hash } = await exportPrimarySample(sampleRelativePath);

      assert.ok(
        dsl && dsl.page && Array.isArray(dsl.page.components) && dsl.page.components.length > 0,
        `Expected sample DSL to load components before export\nsample: ${sampleRelativePath}\npage title: ${dsl?.page?.title ?? '<missing>'}`
      );

      markers.forEach(marker => {
        assert.ok(
          html.includes(marker),
          `Expected Primary HTML export for ${sampleRelativePath} to include marker: ${marker}\n${buildPrimaryRegressionDebug(sampleRelativePath, html, hash, expectedHash, marker, dsl)}`
        );
      });
      assert.strictEqual(
        hash,
        expectedHash,
        [
          `Primary HTML export hash changed for ${sampleRelativePath}`,
          `expected hash: ${expectedHash}`,
          `actual hash: ${hash}`,
          `first marker snippet: ${compactSnippet(html, markers[0]) ?? '<marker not found>'}`,
          `page title: ${dsl?.page?.title ?? '<missing>'}`
        ].join('\n')
      );
    });
  });
});
