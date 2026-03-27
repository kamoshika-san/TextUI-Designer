const assert = require('assert');

const {
  buildHtmlDocument,
  buildFallbackCompatibilityStyleBlock
} = require('../../out/exporters/html-template-builder.js');

describe('HtmlExporter fallback style lane (T-20260327-057)', () => {
  it('keeps fallback compatibility CSS out of the primary default document style block', () => {
    const html = buildHtmlDocument('<div class="textui-tabs"></div>', '', { noWrap: true });

    assert.ok(html.includes('.bg-gray-900'));
    assert.ok(!html.includes('.textui-badge-primary {'));
    assert.ok(!html.includes('.textui-progress-fill {'));
    assert.ok(!html.includes('.textui-tabs .flex > button.textui-tab-active'));
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
