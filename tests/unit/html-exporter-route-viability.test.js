const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { HtmlExporter } = require('../../out/exporters/html-exporter');
const { getProvider } = require('../../out/cli/provider-registry');
const { prepareCaptureArtifacts } = require('../../out/utils/preview-capture/html-preparation');

describe('HtmlExporter route viability (T-20260322-352)', () => {
  const dsl = {
    page: {
      components: [{ Text: { value: 'route viability' } }]
    }
  };

  let originalExport;
  let originalExtraTrustedPaths;
  let originalBrowserPath;
  let originalSkipExecutableCheck;

  beforeEach(() => {
    originalExport = HtmlExporter.prototype.export;
    originalExtraTrustedPaths = process.env.TEXTUI_CAPTURE_EXTRA_TRUSTED_PATHS;
    originalBrowserPath = process.env.TEXTUI_CAPTURE_BROWSER_PATH;
    originalSkipExecutableCheck = process.env.TEXTUI_CAPTURE_SKIP_EXECUTABLE_CHECK;
  });

  afterEach(() => {
    HtmlExporter.prototype.export = originalExport;

    if (originalExtraTrustedPaths === undefined) {
      delete process.env.TEXTUI_CAPTURE_EXTRA_TRUSTED_PATHS;
    } else {
      process.env.TEXTUI_CAPTURE_EXTRA_TRUSTED_PATHS = originalExtraTrustedPaths;
    }

    if (originalBrowserPath === undefined) {
      delete process.env.TEXTUI_CAPTURE_BROWSER_PATH;
    } else {
      process.env.TEXTUI_CAPTURE_BROWSER_PATH = originalBrowserPath;
    }

    if (originalSkipExecutableCheck === undefined) {
      delete process.env.TEXTUI_CAPTURE_SKIP_EXECUTABLE_CHECK;
    } else {
      process.env.TEXTUI_CAPTURE_SKIP_EXECUTABLE_CHECK = originalSkipExecutableCheck;
    }
  });

  it('built-in html provider is already viable on the primary lane', async () => {
    const calls = [];
    HtmlExporter.prototype.export = async function (_dsl, options) {
      calls.push(options);
      return '<html><body>provider</body></html>';
    };

    const provider = getProvider('html');
    assert.ok(provider, 'html provider should exist');

    const html = await provider.render(dsl);

    assert.ok(html.includes('provider'));
    assert.strictEqual(calls.length, 1);
    assert.strictEqual(calls[0].format, 'html');
    assert.strictEqual(calls[0].useReactRender, true);
  });

  it('preview capture preparation defaults to the primary lane and can be validated without switching routes', async () => {
    const calls = [];
    HtmlExporter.prototype.export = async function (_dsl, options) {
      calls.push(options);
      return '<html><body>preview</body></html>';
    };

    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'textui-route-viability-'));
    const fakeBrowserPath = path.join(tempRoot, 'chrome.exe');
    const outputPath = path.join(tempRoot, 'capture.png');
    fs.writeFileSync(fakeBrowserPath, '');

    process.env.TEXTUI_CAPTURE_EXTRA_TRUSTED_PATHS = fakeBrowserPath;
    process.env.TEXTUI_CAPTURE_SKIP_EXECUTABLE_CHECK = '1';

    let result;
    try {
      result = await prepareCaptureArtifacts(dsl, {
        outputPath,
        browserPath: fakeBrowserPath
      });
    } finally {
      if (result?.tempDir) {
        fs.rmSync(result.tempDir, { recursive: true, force: true });
      }
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }

    assert.strictEqual(calls.length, 1);
    assert.strictEqual(calls[0].format, 'html');
    assert.strictEqual(calls[0].useReactRender, true);
  });

  it('preview capture preparation re-loads DSL from dslFilePath so $include is resolved before export', async () => {
    const calls = [];
    HtmlExporter.prototype.export = async function (capturedDsl, options) {
      calls.push({ dsl: capturedDsl, options });
      return '<html><body>preview include</body></html>';
    };

    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'textui-route-viability-include-'));
    const fakeBrowserPath = path.join(tempRoot, 'chrome.exe');
    const outputPath = path.join(tempRoot, 'capture.png');
    fs.writeFileSync(fakeBrowserPath, '');

    process.env.TEXTUI_CAPTURE_EXTRA_TRUSTED_PATHS = fakeBrowserPath;
    process.env.TEXTUI_CAPTURE_SKIP_EXECUTABLE_CHECK = '1';

    const includeEntry = path.resolve(__dirname, '../../sample/03-include/include-sample.tui.yml');
    const unresolvedDsl = {
      page: {
        id: 'include-demo',
        title: 'Dummy',
        components: [
          {
            $include: {
              template: './templates/header.template.yml',
              params: { title: 'ようこそ' }
            }
          }
        ]
      }
    };

    let result;
    try {
      result = await prepareCaptureArtifacts(unresolvedDsl, {
        outputPath,
        browserPath: fakeBrowserPath,
        dslFilePath: includeEntry
      });
    } finally {
      if (result?.tempDir) {
        fs.rmSync(result.tempDir, { recursive: true, force: true });
      }
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }

    assert.strictEqual(calls.length, 1);
    assert.strictEqual(calls[0].options.useReactRender, true);
    assert.ok(Array.isArray(calls[0].dsl.page.components));
    assert.strictEqual(
      calls[0].dsl.page.components.some(component => Object.prototype.hasOwnProperty.call(component, '$include')),
      false,
      'dslFilePath 経由の再読込後に $include が残っている'
    );
  });

  it('capture command remains intentionally fallback-only until its replacement criteria are cleared', () => {
    const repoRoot = path.resolve(__dirname, '../..');
    const captureCommandPath = path.join(repoRoot, 'src/cli/commands/capture-command.ts');
    const source = fs.readFileSync(captureCommandPath, 'utf8');

    assert.match(
      source,
      /withExplicitFallbackHtmlExport\s*\(/,
      'capture command should keep using the explicit fallback helper while this route remains compatibility-only'
    );
    assert.doesNotMatch(
      source,
      /useReactRender\s*:\s*false/,
      'capture command should not carry a raw fallback literal outside the approved helper'
    );
  });
});
