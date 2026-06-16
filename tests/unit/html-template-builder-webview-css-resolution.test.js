const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { readWebviewCssIfPresent } = require('../../out/exporters/html-template-builder.js');

describe('html-template-builder webview CSS resolution (T-20260328-097)', () => {
  const repoRoot = path.resolve(__dirname, '../..');
  const localAssetsDir = path.join(repoRoot, 'out', 'media', 'assets');
  const localFallbackCssPath = path.join(localAssetsDir, 'index-000-local-fallback-test.css');

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
      fs.mkdirSync(localAssetsDir, { recursive: true });
      fs.writeFileSync(localFallbackCssPath, '.from-local-fallback { color: blue; }');

      const localCss = readWebviewCssIfPresent();
      const resolvedCss = readWebviewCssIfPresent(tempRoot);

      assert.ok(localCss, 'expected local built assets to be available in the repo');
      assert.strictEqual(resolvedCss, localCss);
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
      fs.rmSync(localFallbackCssPath, { force: true });
      try {
        fs.rmdirSync(localAssetsDir);
      } catch {
        // Keep any pre-existing local build assets intact.
      }
    }
  });

  it('does not fall back to local built assets when the explicit extensionPath does not exist', () => {
    const missingRoot = path.join(os.tmpdir(), `textui-webview-css-absent-${process.pid}-${Date.now()}`);

    assert.strictEqual(readWebviewCssIfPresent(missingRoot), undefined);
  });
});
