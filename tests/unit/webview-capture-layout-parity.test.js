const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { getSharedLayoutStyles } = require('../../out/shared/layout-styles');
const { Container } = require('../../out/renderer/components/Container');
const { renderPageComponentsToStaticHtml } = require('../../out/exporters/react-static-export');
const { buildHtmlDocument } = require('../../out/exporters/html-template-builder');

describe('webview / capture layout parity', () => {
  const repoRoot = path.resolve(__dirname, '../..');

  it('does not add WebView-only card chrome to every Container', () => {
    const css = getSharedLayoutStyles();

    assert.ok(css.includes('.textui-container.flex.flex-row'));
    assert.ok(!css.includes('.textui-container {'));
    assert.ok(!css.includes('box-shadow'));
    assert.ok(!css.includes('padding: var(--spacing-lg'));
  });

  it('keeps flexGrow Container sizing aligned with exporter output', () => {
    const element = Container({
      layout: 'horizontal',
      width: '0',
      flexGrow: 2,
      minWidth: '36rem',
      children: null
    });

    assert.strictEqual(element.props.style.flexGrow, 2);
    assert.strictEqual(element.props.style.flexShrink, 0);
    assert.strictEqual(element.props.style.flexBasis, '0');
    assert.strictEqual(element.props.style.width, '0');
    assert.strictEqual(element.props.style.minWidth, '36rem');
  });

  it('keeps the current width-affecting WebView shell rules explicit in Globals.css', () => {
    const globalsCss = fs.readFileSync(
      path.join(repoRoot, 'src/renderer/components/styles/Globals.css'),
      'utf8'
    );

    assert.ok(globalsCss.includes('body {'));
    assert.ok(globalsCss.includes('padding: 0 20px;'));
    assert.ok(globalsCss.includes('#root {'));
    assert.ok(globalsCss.includes('padding: 1rem;'));
  });

  it('keeps the current export shell wrapper as a thin 24px padded container', () => {
    const html = renderPageComponentsToStaticHtml([{ Text: { value: 'shell baseline' } }]);

    assert.ok(html.startsWith('<div style="box-sizing:border-box;width:100%;max-width:100%;padding:24px">'));
    assert.ok(html.includes('shell baseline'));
  });

  it('documents that noWrap export does not recreate WebView root chrome', () => {
    const html = buildHtmlDocument('<div>body</div>', '', { noWrap: true });

    assert.ok(html.includes('<body class="bg-gray-900 text-gray-300 min-h-screen">'));
    assert.ok(!html.includes('id="root"'));
    assert.ok(!html.includes('textui-preview-root'));
    assert.ok(!html.includes('padding:1.5rem'));
  });
});
