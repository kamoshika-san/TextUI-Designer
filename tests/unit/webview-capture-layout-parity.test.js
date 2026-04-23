const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { getSharedLayoutStyles } = require('../../out/shared/layout-styles');
const {
  PREVIEW_SHELL_BODY_CLASS,
  PREVIEW_SHELL_FRAME_STYLE,
  PREVIEW_SHELL_ROOT_CLASS
} = require('../../out/shared/preview-shell');
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
    assert.ok(globalsCss.includes('#root,'));
    assert.ok(globalsCss.includes('padding: 1rem;'));
    assert.ok(globalsCss.includes('width: 100%;'));
    assert.ok(globalsCss.includes('padding: 24px;'));
  });

  it('wraps export output in the same PreviewShellCore frame used by WebView', () => {
    const html = renderPageComponentsToStaticHtml([{ Text: { value: 'shell baseline' } }]);

    assert.ok(html.startsWith('<div class="textui-preview-root"'));
    assert.ok(html.includes(`padding:${PREVIEW_SHELL_FRAME_STYLE.padding}px`) || html.includes(`padding: ${PREVIEW_SHELL_FRAME_STYLE.padding}px`));
    assert.ok(html.includes('shell baseline'));
  });

  it('recreates the WebView root shell in noWrap export documents', () => {
    const html = buildHtmlDocument('<div>body</div>', '', { noWrap: true });

    assert.ok(html.includes(`<body class="bg-gray-900 text-gray-300 min-h-screen ${PREVIEW_SHELL_BODY_CLASS}">`));
    assert.ok(html.includes(`<div id="root" class="${PREVIEW_SHELL_ROOT_CLASS}">`));
    assert.ok(!html.includes('class="textui-preview-root"'));
    assert.ok(!html.includes('padding:1.5rem'));
  });
});
