const assert = require('assert');

const {
  buildHtmlDocument,
  buildFallbackCompatibilityStyleBlock
} = require('../../out/exporters/html-template-builder.js');

function extractDefaultStyleBlock(html) {
  const match = html.match(/<style>([\s\S]*?)<\/style>/);
  assert.ok(match, 'expected default document style block');
  return match[1];
}

describe('HtmlExporter fallback style lane (T-20260327-057)', () => {
  it('keeps fallback compatibility CSS out of the primary default document style block', () => {
    const styleBlock = extractDefaultStyleBlock(
      buildHtmlDocument('<div class="textui-tabs"></div>', '', { noWrap: true })
    );

    assert.ok(styleBlock.includes('.bg-gray-900'));
    assert.ok(!styleBlock.includes('.textui-badge-primary {'));
    assert.ok(!styleBlock.includes('.textui-progress-fill {'));
    assert.ok(!styleBlock.includes('.textui-tabs .flex > button.textui-tab-active'));
  });

  it('omits unused light-theme shared utilities from the default export style block', () => {
    const styleBlock = extractDefaultStyleBlock(
      buildHtmlDocument('<div class="textui-tabs"></div>', '', { noWrap: true })
    );

    assert.ok(!styleBlock.includes('.border-gray-300 {'));
    assert.ok(!styleBlock.includes('.text-gray-700 {'));
    assert.ok(!styleBlock.includes('.text-gray-900 {'));
    assert.ok(!styleBlock.includes('.bg-gray-100 {'));
    assert.ok(!styleBlock.includes('.bg-gray-200 {'));
  });

  it('keeps compatibility CSS available only when the fallback lane appends it explicitly', () => {
    const html = buildHtmlDocument('<div class="textui-tabs"></div>', '', {
      compatibilityCss: buildFallbackCompatibilityStyleBlock()
    });

    assert.ok(html.includes('.textui-badge-primary {'));
    assert.ok(html.includes('.textui-progress-fill {'));
    assert.ok(html.includes('.textui-tabs .flex > button.textui-tab-active'));
  });
});
