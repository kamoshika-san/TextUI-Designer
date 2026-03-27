const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { readWebviewCssIfPresent } = require('../../out/exporters/html-template-builder.js');

describe('html-template-builder webview CSS resolution (T-20260328-097)', () => {
  it('prefers an explicit extensionPath asset when present', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'textui-webview-css-'));
    const assetsDir = path.join(tempRoot, 'media', 'assets');
    fs.mkdirSync(assetsDir, { recursive: true });
    fs.writeFileSync(path.join(assetsDir, 'index-test.css'), '.from-explicit-extension { color: red; }');

    try {
      const css = readWebviewCssIfPresent(tempRoot);
      assert.ok(css, 'expected css to resolve from the explicit extension root');
      assert.ok(css.includes('.from-explicit-extension { color: red; }'));
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it('falls back to local built assets when the explicit extensionPath has no media assets', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'textui-webview-css-missing-'));

    try {
      const localCss = readWebviewCssIfPresent();
      const resolvedCss = readWebviewCssIfPresent(tempRoot);

      assert.ok(localCss, 'expected local built assets to be available in the repo');
      assert.strictEqual(resolvedCss, localCss);
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});
