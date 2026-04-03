const assert = require('assert');
const fs = require('fs');
const path = require('path');
const yaml = require('yaml');
const { HtmlExporter } = require('../../../out/exporters/html-exporter');

const repoRoot = path.resolve(__dirname, '../../..');

function loadSample(relativePath) {
  const absolutePath = path.join(repoRoot, relativePath);
  return yaml.parse(fs.readFileSync(absolutePath, 'utf8'));
}

function assertRepresentativeMarkup(output, wrapperTag) {
  const wrapperPattern = new RegExp(`<${wrapperTag}[\\s\\S]*class="textui-generated"[\\s\\S]*>`);

  assert.match(output, wrapperPattern);
  assert.match(output, /TextUI Designer - All Components/);
  assert.match(output, /class="[^"]*textui-progress[^"]*"/);
  assert.match(output, /Overview Tab/);
  assert.match(output, /<table[\s\S]*Alice[\s\S]*Admin[\s\S]*<\/table>/);
}

async function exportPrimaryHtmlSample(relativePath) {
  const dsl = loadSample(relativePath);
  const html = await new HtmlExporter().export(dsl, { format: 'html' });
  return { dsl, html };
}

function assertPrimaryLaneCompatibility(frameworkOutput, primaryHtml) {
  const sharedMarkers = [
    'TextUI Designer - All Components',
    'This sample includes every supported component.',
    'Agree to terms',
    'Overview Tab'
  ];
  const sharedSemanticHooks = [
    'textui-progress',
    'textui-tabs-list',
    'textui-tab-panel-body',
    'textui-table-container',
    'textui-alert-message'
  ];

  sharedMarkers.forEach(marker => {
    assert.match(primaryHtml, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(frameworkOutput, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  });

  sharedSemanticHooks.forEach(className => {
    const classPattern = new RegExp(`class="[^"]*${className}[^"]*"`);
    assert.match(
      primaryHtml,
      classPattern,
      `Expected primary HTML lane to expose semantic class hook: ${className}`
    );
    assert.match(
      frameworkOutput,
      classPattern,
      `Expected framework export to keep primary-lane semantic class hook: ${className}`
    );
  });
}

module.exports = {
  loadSample,
  assertRepresentativeMarkup,
  exportPrimaryHtmlSample,
  assertPrimaryLaneCompatibility
};
